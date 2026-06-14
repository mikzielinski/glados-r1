/** Wrap raw PCM (s16le, mono) in a minimal 44-byte WAV header. */
export function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // audio format = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

export interface ParsedWav {
  pcm: Buffer;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

/** Parse a WAV buffer into PCM samples and header metadata. */
export function parseWav(wav: Buffer): ParsedWav {
  if (wav.length < 44 || wav.toString("ascii", 0, 4) !== "RIFF") {
    return { pcm: wav, sampleRate: 22050, channels: 1, bitsPerSample: 16 };
  }

  let sampleRate = 22050;
  let channels = 1;
  let bitsPerSample = 16;
  let pcm = wav;

  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    if (id === "fmt " && size >= 16) {
      channels = wav.readUInt16LE(dataStart + 2);
      sampleRate = wav.readUInt32LE(dataStart + 4);
      bitsPerSample = wav.readUInt16LE(dataStart + 14);
    } else if (id === "data") {
      pcm = wav.subarray(dataStart, dataStart + size);
      break;
    }
    offset = dataStart + size + (size % 2);
  }

  return { pcm, sampleRate, channels, bitsPerSample };
}

/** Strip a WAV header (if present) and return raw PCM samples. */
export function wavToPcm(wav: Buffer): Buffer {
  return parseWav(wav).pcm;
}
