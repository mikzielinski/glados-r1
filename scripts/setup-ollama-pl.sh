#!/usr/bin/env bash
# Polish-capable SLM for OKO chat. Small models (3B) often sound «foreign» in PL —
# prefer Bielik 7B or qwen2.5:7b when RAM allows.
set -euo pipefail

MODEL="${1:-bielik}"

case "$MODEL" in
  bielik|bielik-7b)
    echo "Pulling pmysl/bielik:7b-instruct-v0.1-q3_k_m (~3.5GB) — native Polish…"
    ollama pull pmysl/bielik:7b-instruct-v0.1-q3_k_m
    echo "Done. Set OLLAMA_MODEL=pmysl/bielik:7b-instruct-v0.1-q3_k_m in backend/.env"
    ;;
  qwen|qwen-3b)
    echo "Pulling qwen2.5:3b (~2GB) — OK multilingual, weaker PL than Bielik…"
    ollama pull qwen2.5:3b
    echo "Done. Set OLLAMA_MODEL=qwen2.5:3b in backend/.env"
    ;;
  qwen-7b)
    echo "Pulling qwen2.5:7b (~4.5GB)…"
    ollama pull qwen2.5:7b
    echo "Done. Set OLLAMA_MODEL=qwen2.5:7b in backend/.env"
    ;;
  llama)
    echo "Pulling llama3.2:3b (~2GB) — weakest PL of the set…"
    ollama pull llama3.2:3b
    echo "Done. Set OLLAMA_MODEL=llama3.2:3b in backend/.env"
    ;;
  *)
    echo "Usage: $0 [bielik|qwen-3b|qwen-7b|llama]"
    echo "  Recommended: bielik (native Polish)"
    exit 1
    ;;
esac
