#!/usr/bin/env bash
# One clean backend + smoke test. Run from repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Stopping old backends =="
lsof -ti :8787 | xargs kill -9 2>/dev/null || true
pkill -9 -f "tsx watch src/index.ts" 2>/dev/null || true
sleep 1

echo "== Starting backend =="
cd "$ROOT/backend"
npm run dev &
sleep 3

echo "== Smoke test =="
"$ROOT/scripts/smoke-test.sh"

echo "== Done. Backend on :8787 =="
