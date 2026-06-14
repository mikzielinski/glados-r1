import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger } from "./logger.js";
import { parseWav, pcmToWav } from "./wav.js";

const log = logger("audio-out");

/** Rabbit R1 speaker path expects 48 kHz — 22050 Hz PCM plays ~2× too fast. */
export const R1_PLAYBACK_RATE = 48_000;

export async function toR1PlaybackRate(
  pcm: Buffer,
  sampleRate: number,
): Promise<{ pcm: Buffer; sampleRate: number }> {
  if (sampleRate === R1_PLAYBACK_RATE || pcm.length === 0) {
    return { pcm, sampleRate: R1_PLAYBACK_RATE };
  }

  const dir = await mkdtemp(join(tmpdir(), "r1-resample-"));
  const inPath = join(dir, "in.wav");
  const outPath = join(dir, "out.wav");
  try {
    await writeFile(inPath, pcmToWav(pcm, sampleRate));
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "ffmpeg",
        ["-y", "-i", inPath, "-ar", String(R1_PLAYBACK_RATE), "-ac", "1", outPath],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let err = "";
      proc.stderr.on("data", (d) => (err += d.toString()));
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg resample failed: ${err.slice(-300)}`));
      });
    });
    const out = parseWav(await readFile(outPath));
    log.debug(`resample ${sampleRate}Hz -> ${R1_PLAYBACK_RATE}Hz (${pcm.length} -> ${out.pcm.length} bytes)`);
    return { pcm: out.pcm, sampleRate: R1_PLAYBACK_RATE };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
