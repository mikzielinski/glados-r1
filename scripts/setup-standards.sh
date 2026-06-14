#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/standards"
command -v pdftotext >/dev/null || echo "Tip: brew install poppler  # for PDF text extraction"
echo "Drop PDF standards into: $ROOT/standards/"
echo "Set STANDARDS_DIR=$ROOT/standards in backend/.env"
