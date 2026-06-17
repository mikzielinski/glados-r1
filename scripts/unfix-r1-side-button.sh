#!/usr/bin/env bash
# Revert side-button remap — restore POWER so Android UI works again.
set -euo pipefail
SERIAL="${1:-}"
ADB=(adb)
[[ -n "$SERIAL" ]] && ADB=(adb -s "$SERIAL")

say() { echo "== $*"; }

say "Root"
"${ADB[@]}" root >/dev/null 2>&1 || true
sleep 1

say "Unmount keylayout overlay (restore stock POWER)"
"${ADB[@]}" shell "umount /system/usr/keylayout 2>/dev/null || true"

say "Remove boot hooks"
"${ADB[@]}" shell "
  rm -f /data/local/tmp/mount-r1-ptt-kl.sh
  if [ -f /data/local/userinit.sh ]; then
    grep -v mount-r1-ptt-kl /data/local/userinit.sh > /tmp/ui.sh 2>/dev/null || true
    mv /tmp/ui.sh /data/local/userinit.sh 2>/dev/null || rm -f /data/local/userinit.sh
  fi
"

say "Re-enable stock launcher"
"${ADB[@]}" shell pm enable com.android.launcher3 2>/dev/null || true

say "Collapse stuck notification shade + relaunch OKO"
"${ADB[@]}" shell "cmd statusbar collapse 2>/dev/null || true"
"${ADB[@]}" shell "am start -n tech.glados.r1/.MainActivity 2>/dev/null || true"

say "Reboot"
"${ADB[@]}" reboot

echo "Done. Side button = POWER again. Hold lens for PTT in OKO."
