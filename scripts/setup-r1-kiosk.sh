#!/usr/bin/env bash
# OKO as default HOME + boot launch. Side-button remap is opt-in (can lock UI).
#
# Usage:
#   ./scripts/setup-r1-kiosk.sh [serial]           # deploy + HOME + reboot
#   ./scripts/setup-r1-kiosk.sh [serial] --side-button
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERIAL=""
SIDE_BUTTON=0
for arg in "$@"; do
  case "$arg" in
    --side-button) SIDE_BUTTON=1 ;;
    *) [[ -z "$SERIAL" ]] && SERIAL="$arg" ;;
  esac
done
ADB=(adb)
[[ -n "$SERIAL" ]] && ADB=(adb -s "$SERIAL")

say() { echo "== $*"; }

say "Install / update OKO"
"$ROOT/scripts/deploy-r1.sh" "$SERIAL"

say "Set OKO as default HOME launcher"
"${ADB[@]}" shell cmd package set-home-activity tech.glados.r1/.MainActivity 2>/dev/null || \
"${ADB[@]}" shell "pm set-home-activity tech.glados.r1/.MainActivity" 2>/dev/null || true
"${ADB[@]}" shell cmd role add-role-holder android.app.role.HOME tech.glados.r1 0 2>/dev/null || true

say "Disable stock Cipher launcher (OKO becomes boot HOME — avoids Android 14 BAL block)"
"${ADB[@]}" root >/dev/null 2>&1 || true
sleep 1
"${ADB[@]}" shell pm disable-user --user 0 com.android.launcher3 2>/dev/null || true
"${ADB[@]}" push "$ROOT/scripts/r1-boot-launch-oko.sh" /data/local/tmp/launch-oko-boot.sh
"${ADB[@]}" shell "
  chmod 755 /data/local/tmp/launch-oko-boot.sh
  if [ ! -f /data/local/userinit.sh ]; then echo '#!/system/bin/sh' > /data/local/userinit.sh; fi
  grep -v launch-oko-boot /data/local/userinit.sh > /tmp/ui.sh 2>/dev/null || true
  echo '/data/local/tmp/launch-oko-boot.sh &' >> /tmp/ui.sh
  mv /tmp/ui.sh /data/local/userinit.sh
  chmod 755 /data/local/userinit.sh
  mkdir -p /data/adb/service.d 2>/dev/null || true
  cp /data/local/tmp/launch-oko-boot.sh /data/adb/service.d/launch-oko-boot.sh 2>/dev/null || true
  chmod 755 /data/adb/service.d/launch-oko-boot.sh 2>/dev/null || true
"

say "Grant boot permissions"
"${ADB[@]}" shell pm grant tech.glados.r1 android.permission.POST_NOTIFICATIONS 2>/dev/null || true

if [[ "$SIDE_BUTTON" -eq 1 ]]; then
  say "Side button PTT remap (--side-button)"
  "$ROOT/scripts/fix-r1-side-button.sh" "$SERIAL"
else
  say "Skipping side-button remap (use --side-button if needed; can lock NotificationShade)"
fi

say "Launch OKO now"
"${ADB[@]}" shell "cmd statusbar collapse 2>/dev/null || true"
"${ADB[@]}" shell "am start -n tech.glados.r1/.MainActivity"

say "Reboot to verify boot launch"
"${ADB[@]}" reboot

echo
echo "OKO kiosk ready. After reboot OKO should start automatically."
echo "Recovery: ./scripts/unfix-r1-side-button.sh ${SERIAL:-<serial>}"
