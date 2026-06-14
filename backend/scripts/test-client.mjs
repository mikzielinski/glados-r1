#!/usr/bin/env node
// End-to-end test harness: emulates the R1 client over WebSocket.
//
// It connects to the backend, sends a typed utterance (bypassing STT), prints
// every status/transcript/assistant message, and writes any TTS audio it
// receives to a .wav file. Useful for validating the whole pipeline (and the
// Tailscale link) without the hardware.
//
// Usage:
//   node scripts/test-client.mjs "napraw błąd w auth.ts" [ws://host:port/ws]
//
// Tip: run the backend with BRAIN_MODE=echo + TTS_FALLBACK=say to exercise the
// full STT->brain->TTS path on a Mac with no API key.

import WebSocket from "ws";
import { writeFileSync } from "node:fs";

const text = process.argv[2] ?? "Hello GLaDOS, are you there?";
const url = process.argv[3] ?? "ws://127.0.0.1:8787/ws";

const ws = new WebSocket(`${url}?sessionId=test-client`);

let ttsSampleRate = 22050;
const ttsChunks = [];
let receivingTts = false;

function pcmToWav(pcm, sampleRate) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * 2;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

ws.on("open", () => {
  console.log(`[open] -> ${url}`);
  ws.send(JSON.stringify({ type: "hello", device: "test-client", clientVersion: "0.1.0" }));
  console.log(`[send text] "${text}"`);
  ws.send(JSON.stringify({ type: "text", text }));
});

ws.on("message", (data, isBinary) => {
  if (isBinary) {
    if (receivingTts) ttsChunks.push(Buffer.from(data));
    return;
  }
  const msg = JSON.parse(data.toString());
  switch (msg.type) {
    case "ready":
      console.log(`[ready] sessionId=${msg.sessionId} agentId=${msg.agentId ?? "-"}`);
      break;
    case "status":
      console.log(`[status] ${msg.state}${msg.detail ? ` (${msg.detail})` : ""}`);
      break;
    case "transcript":
      console.log(`[transcript] ${msg.text}`);
      break;
    case "assistant_text":
      console.log(`[GLaDOS]${msg.final ? "" : " (partial)"} ${msg.text}`);
      break;
    case "tts_start":
      receivingTts = true;
      ttsSampleRate = msg.sampleRate;
      console.log(`[tts_start] ${msg.sampleRate} Hz`);
      break;
    case "tts_end": {
      receivingTts = false;
      const pcm = Buffer.concat(ttsChunks);
      if (pcm.length > 0) {
        const out = `glados-reply.wav`;
        writeFileSync(out, pcmToWav(pcm, ttsSampleRate));
        console.log(`[tts_end] wrote ${pcm.length} bytes -> ${out}`);
      } else {
        console.log(`[tts_end] no audio (mock TTS?)`);
      }
      setTimeout(() => ws.close(), 250);
      break;
    }
    case "error":
      console.log(`[error] ${msg.message}`);
      break;
  }
});

ws.on("close", () => {
  console.log("[close]");
  process.exit(0);
});

ws.on("error", (err) => {
  console.error("[ws error]", err.message);
  process.exit(1);
});

// Safety timeout.
setTimeout(() => {
  console.error("[timeout] no completion within 60s");
  process.exit(2);
}, 60_000);
