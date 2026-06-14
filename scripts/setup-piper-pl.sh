#!/usr/bin/env bash
# Download a Polish Piper voice for OKO. Usage:
#   ./setup-piper-pl.sh           # darkman (default, neutral male)
#   ./setup-piper-pl.sh gosia     # female
#   ./setup-piper-pl.sh mc_speech # another male option
#
# From Hugging Face rhasspy/piper-voices or csukuangfj mirrors.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/models/piper"
VOICE="${1:-darkman}"

case "$VOICE" in
  darkman)
    HF="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pl/pl_PL/darkman/medium"
    NAME="pl_PL-darkman-medium"
    ;;
  gosia)
    HF="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pl/pl_PL/gosia/medium"
    NAME="pl_PL-gosia-medium"
    ;;
  mc_speech)
    HF="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pl/pl_PL/mc_speech/medium"
    NAME="pl_PL-mc_speech-medium"
    ;;
  *)
    echo "Unknown voice: $VOICE (try: darkman, gosia, mc_speech)"
    exit 1
    ;;
esac

ONNX="$DIR/${NAME}.onnx"
JSON="$DIR/${NAME}.onnx.json"
mkdir -p "$DIR"

if [[ ! -f "$ONNX" ]]; then
  echo "Downloading ${NAME}.onnx..."
  curl -L --progress-bar "$HF/${NAME}.onnx" -o "$ONNX.part"
  mv "$ONNX.part" "$ONNX"
fi
if [[ ! -f "$JSON" ]]; then
  echo "Downloading ${NAME}.onnx.json..."
  curl -L "$HF/${NAME}.onnx.json" -o "$JSON"
fi

echo "Done: $ONNX"
echo "Set in backend/.env:"
echo "  PIPER_MODEL_PL=$ONNX"
echo "  PIPER_CONFIG_PL=$JSON"
echo "  TTS_GLADOS_FX=false   # keep off unless you want light EQ"
