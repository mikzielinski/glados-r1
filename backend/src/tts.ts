import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentSkinId } from "./agent-skins.js";
import { fishVoiceIdForSkin } from "./agent-skins.js";
import { polishForSpeech } from "./spoken-polish.js";
import type { Config } from "./config.js";
import { logger } from "./logger.js";
import { applyVoiceFx, fxPresetForSkin } from "./glados-fx.js";
import { toR1PlaybackRate } from "./audio-out.js";
import { parseWav, wavToPcm } from "./wav.js";

const log = logger("tts");

export interface TtsResult {
  pcm: Buffer;
  sampleRate: number;
}

type TtsProvider = "fish" | "glados-net" | "piper" | "piper-pl" | "say-pl" | "mock";

const POLISH_DIACRITICS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
/** Common PL words SLMs write without diacritics — avoids routing to en_US-glados. */
const POLISH_WORDS =
  /\b(jest|masz|mam|nie|tak|czy|ile|bateria|wifi|procent|odpowied|pytan|dziekuje|dzieku|prosze|glados|polsk|asystent|urzadzen|programist)\w*\b/i;
const ENGLISH_ONLY =
  /\b(the|you|your|hello|thanks|please|what|how|why|battery|percent|assistant)\b/i;
const GLADOS_NET_MAX = 256;

/**
 * Text-to-speech for GLaDOS replies.
 *
 * Priority (TTS_MODE=auto):
 *   1. Fish Audio — GLaDOS voice, multilingual (needs FISH_API_KEY)
 *   2. glados.c-net.org — authentic Portal GLaDOS, English text only
 *   3. Piper — local ONNX model
 *   4. macOS `say` with Polish voice (Zosia) as last resort
 */
export class GladosTts {
  private readonly defaultProvider: TtsProvider;

  constructor(private readonly cfg: Config) {
    this.defaultProvider = resolveDefaultProvider(cfg);
    log.info(`TTS default provider: ${this.defaultProvider}`);
  }

  async synthesize(text: string, skin: AgentSkinId = "glados"): Promise<TtsResult> {
    const clean = text.trim();
    if (!clean) return { pcm: Buffer.alloc(0), sampleRate: 48_000 };

    const provider = pickProvider(clean, this.cfg, this.defaultProvider, skin);
    log.info(`TTS provider=${provider} skin=${skin} chars=${clean.length}`);

    try {
      const result = await this.synthesizeWithProvider(clean, provider, skin);
      return toR1PlaybackRate(result.pcm, result.sampleRate);
    } catch (err) {
      if (provider === "fish" && this.cfg.piperModelPl) {
        log.warn(`Fish Audio failed for ${skin} — falling back to Piper PL + FX`, err);
        const result = await this.synthesizeWithProvider(clean, "piper-pl", skin);
        return toR1PlaybackRate(result.pcm, result.sampleRate);
      }
      throw err;
    }
  }

  private async synthesizeWithProvider(
    text: string,
    provider: TtsProvider,
    skin: AgentSkinId,
  ): Promise<TtsResult> {
    switch (provider) {
      case "fish":
        return this.fishAudio(text, skin);
      case "glados-net":
        return this.gladosNet(text);
      case "piper":
        return this.piper(text, this.cfg.piperModel, this.cfg.piperConfig);
      case "piper-pl": {
        const { model, config } = piperPlModelForSkin(skin, this.cfg);
        let result = await this.piper(
          text,
          model,
          config,
          piperLengthScaleForSkin(skin, this.cfg),
        );
        if (this.cfg.ttsGladosFx) {
          try {
            result = await applyVoiceFx(
              result.pcm,
              result.sampleRate,
              fxPresetForSkin(skin, this.cfg.ttsGladosFxPreset),
            );
          } catch (err) {
            log.warn(`voice-fx failed for ${skin}, using dry Piper PL`, err);
          }
        }
        return result;
      }
      case "say-pl":
        return this.macSay(text, this.cfg.sayVoicePl);
      default:
        return { pcm: Buffer.alloc(0), sampleRate: 48_000 };
    }
  }

  /** Fish Audio — GLaDOS PL clone only (HAL/TARS Fish models are English). */
  private async fishAudio(text: string, skin: AgentSkinId): Promise<TtsResult> {
    const spoken = polishForSpeech(text);
    const voiceId = fishVoiceIdForSkin(skin, {
      glados: this.cfg.fishVoiceId,
      hal: this.cfg.fishVoiceIdHal,
      tars: this.cfg.fishVoiceIdTars,
    });
    log.debug(`fish voice=${voiceId.slice(0, 8)}… skin=${skin} chars=${spoken.length}`);
    const resp = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.cfg.fishApiKey}`,
        "Content-Type": "application/json",
        model: this.cfg.fishModel,
      },
      body: JSON.stringify({
        text: spoken,
        reference_id: voiceId,
        format: "wav",
        sample_rate: 44100,
        normalize: true,
        latency: "balanced",
        prosody: {
          speed: 1,
          volume: 0,
          normalize_loudness: true,
        },
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Fish Audio TTS failed (${resp.status}): ${body.slice(0, 300)}`);
    }

    const wav = Buffer.from(await resp.arrayBuffer());
    const { pcm, sampleRate } = parseWav(wav);
    return { pcm, sampleRate };
  }

  /**
   * Free Portal GLaDOS voice (glados.c-net.org). English only; Polish text
   * fails server-side. Retries while the sample is generated (up to ~5 min).
   */
  private async gladosNet(text: string): Promise<TtsResult> {
    const chunks = chunkText(text, GLADOS_NET_MAX);
    const pcmParts: Buffer[] = [];
    let sampleRate = 44100;

    for (const chunk of chunks) {
      const wav = await this.fetchGladosNetChunk(chunk);
      const parsed = parseWav(wav);
      pcmParts.push(parsed.pcm);
      sampleRate = parsed.sampleRate;
    }

    return { pcm: Buffer.concat(pcmParts), sampleRate };
  }

  private async fetchGladosNetChunk(text: string): Promise<Buffer> {
    const url = new URL(this.cfg.gladosNetUrl);
    url.searchParams.set("text", text);

    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const resp = await fetch(url, { redirect: "follow" });
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "RIFF") return buf;
        throw new Error("glados.c-net.org returned non-WAV data");
      }
      if (resp.status === 404 || resp.status === 202 || resp.status === 503) {
        log.debug(`glados-net waiting (attempt ${attempt}/${maxAttempts})`);
        await sleep(Math.min(2000 * attempt, 10_000));
        continue;
      }
      const body = await resp.text().catch(() => "");
      throw new Error(`glados.c-net.org failed (${resp.status}): ${body.slice(0, 200)}`);
    }
    throw new Error("glados.c-net.org timed out waiting for audio generation");
  }

  private piper(text: string, model: string, config: string, lengthScale?: number): Promise<TtsResult> {
    if (!model) {
      return Promise.reject(new Error("Piper model path not configured"));
    }
    const cfgPath = config || model.replace(/\.onnx$/, ".onnx.json");
    const scale = lengthScale ?? this.cfg.piperLengthScale;
    log.debug(`piper python -m piper -m ${model} scale=${scale}`);
    return new Promise((resolve, reject) => {
      const dirPromise = mkdtemp(join(tmpdir(), "glados-tts-"));
      dirPromise.then(async (dir) => {
        const wavPath = join(dir, "out.wav");
        try {
          await new Promise<void>((res, rej) => {
            const proc = spawn(
              this.cfg.piperBin || "python3",
              [
                "-m", "piper",
                "-m", model,
                "-c", cfgPath,
                "-f", wavPath,
                "--length-scale", String(scale),
              ],
              { stdio: ["pipe", "ignore", "pipe"] },
            );
            let stderr = "";
            proc.stderr.on("data", (d) => (stderr += d.toString()));
            proc.on("error", rej);
            proc.on("close", (code) => {
              if (code === 0) res();
              else rej(new Error(`piper exited ${code}: ${stderr.slice(-500)}`));
            });
            proc.stdin.write(text);
            proc.stdin.end();
          });
          const wav = await readFile(wavPath);
          const parsed = parseWav(wav);
          resolve({ pcm: parsed.pcm, sampleRate: parsed.sampleRate });
        } catch (err) {
          reject(err);
        } finally {
          await rm(dir, { recursive: true, force: true }).catch(() => {});
        }
      }).catch(reject);
    });
  }

  private async macSay(text: string, voice: string): Promise<TtsResult> {
    const dir = await mkdtemp(join(tmpdir(), "glados-tts-"));
    const wavPath = join(dir, "out.wav");
    const rate = 22050;
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(
          "say",
          ["-v", voice, "--data-format=LEI16@22050", "-o", wavPath, "--file-format=WAVE", text],
          { stdio: ["ignore", "ignore", "pipe"] },
        );
        let stderr = "";
        proc.stderr.on("data", (d) => (stderr += d.toString()));
        proc.on("error", reject);
        proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`say exited ${code}: ${stderr}`))));
      });
      const wav = await readFile(wavPath);
      return { pcm: wavToPcm(wav), sampleRate: rate };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function resolveDefaultProvider(cfg: Config): TtsProvider {
  const mode = cfg.ttsMode;
  if (mode === "fish" && cfg.fishApiKey) return "fish";
  if (mode === "glados-net") return "glados-net";
  if (mode === "piper" && cfg.piperModel) return "piper";
  if (mode === "say") return "say-pl";
  if (mode === "mock") return "mock";

  // auto — Fish GLaDOS when API key set, else local Piper
  if (cfg.fishApiKey) return "fish";
  if (cfg.piperModelPl) return "piper-pl";
  return "glados-net";
}

function pickProvider(
  text: string,
  cfg: Config,
  fallback: TtsProvider,
  skin: AgentSkinId,
): TtsProvider {
  if (cfg.ttsMode !== "auto" && cfg.ttsMode !== "fish" && cfg.ttsMode !== "piper") return fallback;

  const polish = looksPolish(text);

  // GLaDOS: Fish PL clone speaks Polish correctly (same fix as in our first GLaDOS voice work).
  if (skin === "glados" && cfg.fishApiKey && polish) return "fish";

  // HAL / TARS: male Piper PL (darkman) + character FX — gosia sounds like default female TTS.
  if ((skin === "hal9000" || skin === "tars") && polish && (cfg.piperModelPlMale || cfg.piperModelPl)) {
    return "piper-pl";
  }

  // English on HAL/TARS can still use Fish character voice.
  if ((skin === "hal9000" || skin === "tars") && cfg.fishApiKey && !polish) return "fish";

  if (cfg.fishApiKey && skin === "glados") return "fish";
  if (cfg.piperModelPl && polish) return "piper-pl";
  if (cfg.piperModel) return "piper";
  if (polish) return "say-pl";
  if (fallback === "piper" || fallback === "glados-net") return fallback;
  return fallback;
}

function piperPlModelForSkin(
  skin: AgentSkinId,
  cfg: Config,
): { model: string; config: string } {
  if (skin === "hal9000" || skin === "tars") {
    const model = cfg.piperModelPlMale || cfg.piperModelPl;
    const config = cfg.piperConfigPlMale || cfg.piperConfigPl || model.replace(/\.onnx$/, ".onnx.json");
    log.debug(`piper-pl skin=${skin} model=${model.split("/").pop()}`);
    return { model, config };
  }
  const model = cfg.piperModelPl;
  const config = cfg.piperConfigPl || model.replace(/\.onnx$/, ".onnx.json");
  return { model, config };
}

function piperLengthScaleForSkin(skin: AgentSkinId, cfg: Config): number {
  switch (skin) {
    case "hal9000":
      return cfg.piperLengthScale;
    case "tars":
      return cfg.piperLengthScale;
    default:
      return cfg.piperLengthScale * 1.05;
  }
}

function looksPolish(text: string): boolean {
  return POLISH_DIACRITICS.test(text) || POLISH_WORDS.test(text);
}

function looksEnglishOnly(text: string): boolean {
  return !looksPolish(text) && ENGLISH_ONLY.test(text);
}

function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf(". ", maxLen);
    if (cut < maxLen / 2) cut = rest.lastIndexOf(" ", maxLen);
    if (cut < maxLen / 2) cut = maxLen;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.filter(Boolean);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
