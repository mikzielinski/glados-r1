import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentSkinId } from "./agent-skins.js";
import { logger } from "./logger.js";
import { parseWav } from "./wav.js";

const log = logger("glados-fx");

/** portal = ring-mod + EQ only (no chorus/echo — clearer speech on R1). */
export type GladosFxPreset = "portal" | "subtle" | "ingame" | "heavy" | "eq";
export type VoiceFxPreset = GladosFxPreset | "hal" | "tars";

const RING_PRESETS: Record<Exclude<GladosFxPreset, "eq">, { sineHz: number; ringWeight: number; spaceFx: boolean }> = {
  portal: { sineHz: 58, ringWeight: 0.10, spaceFx: false },
  subtle: { sineHz: 50, ringWeight: 0.18, spaceFx: true },
  ingame: { sineHz: 64, ringWeight: 0.32, spaceFx: true },
  heavy: { sineHz: 95, ringWeight: 0.6, spaceFx: true },
};

export async function applyGladosFx(
  pcm: Buffer,
  sampleRate: number,
  preset: GladosFxPreset = "portal",
): Promise<{ pcm: Buffer; sampleRate: number }> {
  return applyVoiceFx(pcm, sampleRate, preset);
}

/** Polish Piper base + character FX — tuned per HAL / TARS / GLaDOS table. */
export async function applyVoiceFx(
  pcm: Buffer,
  sampleRate: number,
  preset: VoiceFxPreset = "portal",
): Promise<{ pcm: Buffer; sampleRate: number }> {
  const dir = await mkdtemp(join(tmpdir(), "glados-fx-"));
  const inPath = join(dir, "in.wav");
  const outPath = join(dir, "out.wav");
  try {
    await writeFile(inPath, pcmToWav(pcm, sampleRate));
    if (preset === "eq") {
      await runSimpleEq(inPath, outPath, sampleRate);
    } else if (preset === "hal") {
      await runHalFx(inPath, outPath, sampleRate);
    } else if (preset === "tars") {
      await runTarsFx(inPath, outPath, sampleRate);
    } else {
      await runRingModFx(inPath, outPath, sampleRate, RING_PRESETS[preset]);
    }
    const out = parseWav(await readFile(outPath));
    log.info(`voice-fx preset=${preset} ${pcm.length}B -> ${out.pcm.length}B @ ${out.sampleRate}Hz`);
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function semitoneRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

function runRingModFx(
  input: string,
  output: string,
  sampleRate: number,
  { sineHz, ringWeight, spaceFx }: { sineHz: number; ringWeight: number; spaceFx: boolean },
): Promise<void> {
  const space = spaceFx
    ? `[mix]chorus=0.5:0.9:50|60:0.4|0.32:0.25|0.3:2|2.3,aecho=0.8:0.7:55|110:0.28|0.18,`
    : `[mix]`;
  const filter = [
    `[0:a]highpass=f=120,lowpass=f=7600,`,
    `equalizer=f=1800:t=q:w=1.4:g=3,`,
    `equalizer=f=3200:t=q:w=1.6:g=2[voc];`,
    `[voc][1:a]amultiply[rm];`,
    `[voc]anull[dry];`,
    `[dry][rm]amix=inputs=2:weights=1 ${ringWeight}[mix];`,
    `${space}`,
    `acompressor=threshold=-18dB:ratio=3:attack=8:release=160,`,
    `alimiter=limit=0.95[out]`,
  ].join("");

  return runFfmpegComplex(input, output, sampleRate, sineHz, filter);
}

/**
 * HAL — darkman, pitch −3.5 st, tempo 0.80, ring-mod 40 Hz depth 0.25, small room.
 * Dry + intimate; no flanger.
 */
function runHalFx(input: string, output: string, sampleRate: number): Promise<void> {
  const pitch = semitoneRatio(-3.5);
  const pitchRate = Math.round(sampleRate * pitch);
  const filter = [
    `[0:a]asetrate=${pitchRate},aresample=${sampleRate},atempo=0.80,`,
    `highpass=f=90,lowpass=f=5200,`,
    `equalizer=f=800:t=q:w=1.2:g=2,`,
    `equalizer=f=2100:t=q:w=1.3:g=1[voc];`,
    `[voc][1:a]amultiply[rm];`,
    `[voc]anull[dry];`,
    `[dry][rm]amix=inputs=2:weights=1 0.25[mix];`,
    `[mix]aecho=0.45:0.35:35:0.10,`,
    `acompressor=threshold=-20dB:ratio=2.8:attack=12:release=200,`,
    `alimiter=limit=0.93[out]`,
  ].join("");
  return runFfmpegComplex(input, output, sampleRate, 40, filter);
}

/**
 * TARS — darkman, pitch −1 st, tempo 1.0, ring-mod 60 Hz depth 0.30, dry flanger (intercom).
 */
function runTarsFx(input: string, output: string, sampleRate: number): Promise<void> {
  const pitch = semitoneRatio(-1);
  const pitchRate = Math.round(sampleRate * pitch);
  const tempoComp = (1 / pitch).toFixed(4);
  const filter = [
    `[0:a]asetrate=${pitchRate},aresample=${sampleRate},atempo=${tempoComp},`,
    `highpass=f=100,lowpass=f=7200,`,
    `equalizer=f=2400:t=q:w=1.4:g=2.5,`,
    `equalizer=f=4300:t=q:w=1.1:g=-1.5[voc];`,
    `[voc][1:a]amultiply[rm];`,
    `[voc]anull[dry];`,
    `[dry][rm]amix=inputs=2:weights=1 0.30[mix];`,
    `[mix]flanger=delay=0:depth=2:regen=0.2:speed=0.3,`,
    `acompressor=threshold=-14dB:ratio=3.5:attack=4:release=90,`,
    `alimiter=limit=0.95[out]`,
  ].join("");
  return runFfmpegComplex(input, output, sampleRate, 60, filter);
}

function runFfmpegComplex(
  input: string,
  output: string,
  sampleRate: number,
  sineHz: number,
  filter: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "ffmpeg",
      [
        "-y", "-i", input,
        "-f", "lavfi", "-i", `sine=frequency=${sineHz}:sample_rate=${sampleRate}`,
        "-filter_complex", filter,
        "-map", "[out]", "-ar", String(sampleRate), "-ac", "1", output,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let err = "";
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg glados-fx failed: ${err.slice(-500)}`));
    });
  });
}

function runSimpleEq(input: string, output: string, sampleRate: number): Promise<void> {
  const filter = "highpass=f=80,lowpass=f=9000,compand=0.02|0.05:-90/-90|-18/-12|0/0";
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "ffmpeg",
      ["-y", "-i", input, "-af", filter, "-ar", String(sampleRate), "-ac", "1", output],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let err = "";
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg glados-eq failed: ${err.slice(-400)}`));
    });
  });
}

function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export function parseGladosFxPreset(raw: string): GladosFxPreset {
  switch (raw.toLowerCase()) {
    case "portal":
    case "subtle":
    case "ingame":
    case "in-game":
    case "heavy":
    case "eq":
      if (raw.toLowerCase() === "in-game") return "ingame";
      return raw.toLowerCase() as GladosFxPreset;
    default:
      return "portal";
  }
}

export function fxPresetForSkin(skin: AgentSkinId, gladosPresetRaw: string): VoiceFxPreset {
  switch (skin) {
    case "hal9000":
      return "hal";
    case "tars":
      return "tars";
    default:
      return parseGladosFxPreset(gladosPresetRaw);
  }
}
