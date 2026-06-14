import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Config } from "./config.js";
import { logger } from "./logger.js";
import { pcmToWav } from "./wav.js";

const log = logger("stt");

const DEFAULT_PL_PROMPT =
  "Użytkownik mówi po polsku. Przykład: Dzień dobry, napraw błąd w kodzie, otwórz plik w repozytorium.";

/**
 * Local speech-to-text via a whisper.cpp CLI binary (`whisper-cli` / `main`).
 * If no binary is configured, runs in mock mode so the rest of the pipeline
 * can be developed without a model installed.
 */
export class WhisperStt {
  private readonly enabled: boolean;

  constructor(private readonly cfg: Config) {
    this.enabled = Boolean(cfg.whisperBin && cfg.whisperModel);
    if (!this.enabled) {
      log.warn("WHISPER_BIN/WHISPER_MODEL not set — STT runs in MOCK mode");
    }
  }

  async transcribe(pcm: Buffer, sampleRate: number): Promise<string> {
    if (pcm.length === 0) return "";
    if (!this.enabled) {
      return "[mock transcript] set WHISPER_BIN and WHISPER_MODEL to enable real STT";
    }

    const dir = await mkdtemp(join(tmpdir(), "glados-stt-"));
    const wavPath = join(dir, "in.wav");
    const outPrefix = join(dir, "out");
    const normalized = normalizePcm16(pcm);
    const durationSec = normalized.length / (sampleRate * 2);
    try {
      await writeFile(wavPath, pcmToWav(normalized, sampleRate));
      await this.run(wavPath, outPrefix, durationSec);
      const txt = await readFile(`${outPrefix}.txt`, "utf8").catch(() => "");
      const transcript = txt.trim();
      log.info(`transcribed ${durationSec.toFixed(1)}s (${this.cfg.whisperLang}): "${transcript}"`);
      return transcript;
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private run(wavPath: string, outPrefix: string, durationSec: number): Promise<void> {
    const lang = this.cfg.whisperLang || "auto";
    const prompt =
      this.cfg.whisperPrompt ||
      (lang === "pl" ? DEFAULT_PL_PROMPT : "");

    const args = [
      "-m", this.cfg.whisperModel,
      "-f", wavPath,
      "-otxt",
      "-of", outPrefix,
      "-l", lang,
      "-t", String(this.cfg.whisperThreads),
      "-nth", String(this.cfg.whisperNoSpeechThold),
      "-np",
    ];
    if (prompt) {
      args.push("--prompt", prompt, "--carry-initial-prompt");
    }

    const timeoutMs = Math.max(30_000, Math.ceil(durationSec * 4_000));
    log.debug(`spawn ${this.cfg.whisperBin} ${args.join(" ")} (timeout ${timeoutMs}ms)`);
    return new Promise((resolve, reject) => {
      const proc = spawn(this.cfg.whisperBin, args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        reject(new Error(`whisper timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      proc.stderr.on("data", (d) => (stderr += d.toString()));
      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`whisper exited ${code}: ${stderr.slice(-500)}`));
      });
    });
  }
}

/** Boost quiet R1 mic captures before sending them to Whisper. */
function normalizePcm16(pcm: Buffer): Buffer {
  if (pcm.length < 4) return pcm;
  let peak = 0;
  for (let i = 0; i < pcm.length; i += 2) {
    peak = Math.max(peak, Math.abs(pcm.readInt16LE(i)));
  }
  if (peak < 800) return pcm;
  const gain = Math.min(32767 / peak, 6);
  if (gain <= 1.1) return pcm;
  const out = Buffer.from(pcm);
  for (let i = 0; i < out.length; i += 2) {
    const boosted = Math.round(out.readInt16LE(i) * gain);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, boosted)), i);
  }
  return out;
}
