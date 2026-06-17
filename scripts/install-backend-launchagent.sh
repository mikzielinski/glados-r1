#!/usr/bin/env bash
# Install macOS LaunchAgent — backend starts on login (R1 can connect without you opening a terminal).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
PLIST="$HOME/Library/LaunchAgents/com.oko.glados-backend.plist"
LOG_DIR="$ROOT/backend/logs"
NODE="$(command -v node || true)"
NPX="$(command -v npx || true)"

[ -d "$BACKEND" ] || { echo "backend dir missing"; exit 1; }
[ -f "$BACKEND/.env" ] || { echo "Create backend/.env first (cp .env.example .env)"; exit 1; }
[ -n "$NODE" ] || { echo "node not found"; exit 1; }

mkdir -p "$LOG_DIR"

# Prefer compiled start if built; else tsx dev is too heavy for launchd — use tsx without watch.
RUN="$NPX tsx src/index.ts"
if [ -f "$BACKEND/dist/index.js" ]; then
  RUN="$NODE --experimental-strip-types dist/index.js"
fi

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.oko.glados-backend</string>
  <key>WorkingDirectory</key>
  <string>${BACKEND}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd '${BACKEND}' && ${RUN}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/backend.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/backend.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/com.oko.glados-backend" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl enable "gui/$(id -u)/com.oko.glados-backend"
echo "Installed: $PLIST"
echo "Logs: $LOG_DIR/backend.*.log"
echo "Unload: launchctl bootout gui/$(id -u)/com.oko.glados-backend"
