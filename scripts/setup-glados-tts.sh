#!/usr/bin/env bash
# One-time setup: free local GLaDOS voice (Piper) + Python deps.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODELS="$ROOT/models/piper"

echo "== Installing Python piper-tts =="
python3 -m pip install --user piper-tts 2>/dev/null || pip3 install piper-tts

echo "== Downloading GLaDOS Piper model (~64 MB) =="
mkdir -p "$MODELS"
cd "$MODELS"

if [ ! -f en_US-glados.onnx ]; then
  curl -L --fail -o glados.tar.bz2 \
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-glados.tar.bz2"
  tar xjf glados.tar.bz2
  rm glados.tar.bz2
  find . -name "en_US-glados.onnx" -exec mv -f {} . \; 2>/dev/null || true
fi

if [ ! -f en_US-glados.onnx.json ]; then
  curl -sL "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json" \
    -o en_US-glados.onnx.json
  python3 -c "
import json
p='en_US-glados.onnx.json'
d=json.load(open(p))
d['dataset']='glados'
d['audio']['sample_rate']=22050
json.dump(d, open(p,'w'), indent=2)
"
fi

echo "== Smoke test =="
echo "Hello test subject." | python3 -m piper -m "$MODELS/en_US-glados.onnx" -c "$MODELS/en_US-glados.onnx.json" -f /tmp/glados_test.wav
file /tmp/glados_test.wav

echo ""
echo "Add to backend/.env:"
echo "PIPER_MODEL=$MODELS/en_US-glados.onnx"
echo "PIPER_CONFIG=$MODELS/en_US-glados.onnx.json"
echo "TTS_MODE=auto"
