#!/usr/bin/env bash
# Install OKO backend as systemd service on Linux (VPS, NAS, RPi).
# Run as root or with sudo on the target host.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_DIR="${OKO_INSTALL_DIR:-/opt/oko/glados-r1}"
OKO_USER="${OKO_USER:-oko}"
SERVICE="/etc/systemd/system/oko-backend.service"

say() { echo "== $*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo $0"
  exit 1
fi

say "User $OKO_USER"
id "$OKO_USER" 2>/dev/null || useradd -r -m -d "/home/$OKO_USER" -s /bin/bash "$OKO_USER"

say "Copy repo to $INSTALL_DIR"
mkdir -p "$(dirname "$INSTALL_DIR")"
if [ "$ROOT" != "$INSTALL_DIR" ]; then
  rsync -a --delete \
    --exclude node_modules --exclude .git --exclude android/.gradle \
    "$ROOT/" "$INSTALL_DIR/"
fi
chown -R "$OKO_USER:$OKO_USER" "$INSTALL_DIR"

say "Build backend"
sudo -u "$OKO_USER" bash -lc "cd '$INSTALL_DIR/backend' && npm ci && npm run build"

if [ ! -f "$INSTALL_DIR/backend/.env" ]; then
  cp "$INSTALL_DIR/backend/.env.example" "$INSTALL_DIR/backend/.env"
  echo "Created $INSTALL_DIR/backend/.env — edit CURSOR_API_KEY, FISH_API_KEY, REPO_PATH, HOST=0.0.0.0"
fi

say "Install systemd unit"
sed "s|/opt/oko/glados-r1|$INSTALL_DIR|g" "$INSTALL_DIR/deploy/linux/oko-backend.service" > "$SERVICE"

systemctl daemon-reload
systemctl enable oko-backend
echo ""
echo "Next:"
echo "  1. Edit $INSTALL_DIR/backend/.env (HOST=0.0.0.0, keys, model paths)"
echo "  2. Install Ollama + models: sudo -u $OKO_USER ./scripts/setup-ollama-pl.sh bielik"
echo "  3. sudo systemctl start oko-backend"
echo "  4. curl http://$(hostname -I | awk '{print $1}'):8787/health"
echo "  5. R1 SET → ws://<this-server-ip>:8787/ws"
