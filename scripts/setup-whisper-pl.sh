#!/usr/bin/env bash
# Download a multilingual Whisper model with decent Polish accuracy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODEL_DIR="$ROOT/models"
MODEL="$MODEL_DIR/ggml-small.bin"
URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"

mkdir -p "$MODEL_DIR"
if [[ -f "$MODEL" ]]; then
  echo "Already present: $MODEL"
  exit 0
fi

echo "Downloading ggml-small.bin (~466 MB) for Polish STT..."
curl -L --progress-bar "$URL" -o "$MODEL.part"
mv "$MODEL.part" "$MODEL"
echo "Done: $MODEL"
echo "Set in backend/.env:"
echo "  WHISPER_MODEL=$MODEL"
echo "  WHISPER_LANG=pl"
