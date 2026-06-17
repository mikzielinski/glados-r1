#!/usr/bin/env bash
# Print WebSocket URLs to paste into R1 SET — no USB cable needed for daily use.
set -euo pipefail

PORT="${PORT:-8787}"
LAN=""
for iface in en0 en1; do
  ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  if [ -n "$ip" ]; then LAN="$ip"; break; fi
done

TS=""
if command -v tailscale >/dev/null 2>&1; then
  TS=$(tailscale ip -4 2>/dev/null || true)
fi

echo "=== OKO — konfiguracja bez kabla ==="
echo ""
echo "1. Backend na hoście musi działać i nasłuchiwać na 0.0.0.0 (HOST=0.0.0.0 w backend/.env)"
echo "2. R1 i host w tej samej sieci WiFi LUB oba na Tailscale"
echo "3. W R1: SET → wklej URL-e (jeden na linię):"
echo ""
if [ -n "$LAN" ]; then
  echo "ws://${LAN}:${PORT}/ws"
fi
if [ -n "$TS" ] && [ "$TS" != "$LAN" ]; then
  echo "ws://${TS}:${PORT}/ws"
fi
echo "ws://glados-mac:${PORT}/ws"
echo ""
echo "4. Autostart backendu po włączeniu Maca (opcjonalnie):"
echo "   ./scripts/install-backend-launchagent.sh"
echo ""
echo "5. Kabel USB — tylko do: adb install, flash, fix side button (jednorazowo)"
echo ""
if [ -n "$LAN" ]; then
  echo "Test z Maca: curl -s http://${LAN}:${PORT}/health | head -c 120; echo"
fi
