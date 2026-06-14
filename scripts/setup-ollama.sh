#!/usr/bin/env bash
# Install Ollama (if missing) and pull the default SLM for OKO chat turns.
set -euo pipefail

MODEL="${OLLAMA_MODEL:-llama3.2:3b}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama not found. Install from https://ollama.com/download"
  echo "  macOS: brew install ollama"
  exit 1
fi

if ! curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "Starting Ollama..."
  ollama serve >/dev/null 2>&1 &
  sleep 2
fi

echo "Pulling model ${MODEL} (may take a few minutes on first run)..."
ollama pull "$MODEL"

echo "Done. Set in backend/.env:"
echo "  BRAIN_MODE=hybrid"
echo "  OLLAMA_MODEL=${MODEL}"
