#!/usr/bin/env bash
# Test Polish GLaDOS voice: text → Piper gosia → glados_fx → afplay
# Usage: ./speak-pl.sh "Witaj w laboratorium."
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODEL="$ROOT/models/piper/pl_PL-gosia-medium.onnx"
CONFIG="$ROOT/models/piper/pl_PL-gosia-medium.onnx.json"
PRESET="${TTS_GLADOS_FX_PRESET:-ingame}"
TXT="${*:-Witaj z powrotem. Tęskniłam za tobą.}"

TMP=$(mktemp /tmp/glados-pl.XXXX)
trap 'rm -f "$TMP" "$TMP.wav" "$TMP.glados.wav"' EXIT

echo "$TXT" | python3 -m piper -m "$MODEL" -c "$CONFIG" -f "$TMP.wav"
"$ROOT/scripts/glados_fx.sh" "$TMP.wav" "$TMP.glados.wav" "$PRESET"
afplay "$TMP.glados.wav" 2>/dev/null || ffplay -nodisp -autoexit "$TMP.glados.wav" 2>/dev/null
