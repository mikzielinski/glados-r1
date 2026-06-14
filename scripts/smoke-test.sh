#!/usr/bin/env bash
# End-to-end smoke test: SLM + Polish TTS with GLaDOS FX
set -euo pipefail
cd "$(dirname "$0")/../backend"
npx tsx <<'EOF'
import WebSocket from 'ws';
import { loadConfig } from './src/config.js';
import { GladosTts } from './src/tts.js';

const cfg = loadConfig();
const tts = new GladosTts(cfg);
const pl = 'Bateria wynosi czterdzieści dwa procenty. Tak, odpowiadam na pytania.';
const result = await tts.synthesize(pl);
console.log(`TTS PL: ${result.pcm.length} bytes pcm @ ${result.sampleRate} Hz`);
if (result.pcm.length < 1000) throw new Error('TTS output too small');

const ws = new WebSocket('ws://127.0.0.1:8787/ws?sessionId=smoke-' + Date.now());
let pcmBytes = 0;
const t0 = Date.now();
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), 60000);
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', device: 'test', clientVersion: '0.1' })));
  ws.on('message', (data, isBinary) => {
    if (isBinary) { pcmBytes += data.length; return; }
    const msg = JSON.parse(data.toString());
    if (msg.type === 'ready') {
      ws.send(JSON.stringify({ type: 'text', text: 'Kim jesteś? Odpowiedz krótko po polsku.' }));
    } else if (msg.type === 'tts_end') {
      clearTimeout(timer);
      console.log(`WS turn: ${Date.now() - t0}ms, pcm=${pcmBytes}`);
      ws.close();
      resolve(undefined);
    } else if (msg.type === 'error') {
      clearTimeout(timer);
      reject(new Error(msg.message));
    }
  });
  ws.on('error', reject);
});
console.log('ALL OK');
EOF
