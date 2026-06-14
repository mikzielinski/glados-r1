#!/usr/bin/env bash
# Better Polish SLM for GLaDOS chat (less nonsense than llama3.2).
set -euo pipefail
echo "Pulling qwen2.5:3b (~2GB)..."
ollama pull qwen2.5:3b
echo "Done. Set OLLAMA_MODEL=qwen2.5:3b in backend/.env"
