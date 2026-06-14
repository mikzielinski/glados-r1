#!/usr/bin/env bash
# Remap R1 side button: POWER -> KEYCODE_F1 (app PTT) via keylayout overlay.
# Uses bind-mount from /data when /system is full (common on CipherOS).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERIAL="${1:-}"
ADB=(adb)
[[ -n "$SERIAL" ]] && ADB=(adb -s "$SERIAL")

OVERLAY="$ROOT/r1-flash/overlays"
KL_DIR="/data/local/tmp/r1-keylayout"
INIT_SCRIPT="/data/local/tmp/mount-r1-ptt-kl.sh"
PERSIST="/data/local/userinit.sh"

say() { echo "== $*"; }

say "Root"
"${ADB[@]}" root >/dev/null 2>&1 || true
sleep 1

say "Build overlay keylayout dir on /data"
"${ADB[@]}" shell "mkdir -p '$KL_DIR' && cp /system/usr/keylayout/*.kl '$KL_DIR/' 2>/dev/null || true"

"${ADB[@]}" push "$OVERLAY/Vendor_0000_Product_0000.kl" "$KL_DIR/Vendor_0000_Product_0000.kl"
"${ADB[@]}" push "$OVERLAY/Vendor_0001_Product_0001.kl" "$KL_DIR/Vendor_0001_Product_0001.kl"

say "Bind-mount over /system/usr/keylayout"
"${ADB[@]}" shell "
  umount /system/usr/keylayout 2>/dev/null || true
  mount --bind '$KL_DIR' /system/usr/keylayout
  ls -la /system/usr/keylayout/Vendor_0001_Product_0001.kl
"

say "Install boot hook (re-applies bind after reboot)"
"${ADB[@]}" shell "cat > '$INIT_SCRIPT' << 'EOF'
#!/system/bin/sh
KL_DIR=$KL_DIR
sleep 5
umount /system/usr/keylayout 2>/dev/null
mount --bind \"\$KL_DIR\" /system/usr/keylayout
EOF
chmod 755 '$INIT_SCRIPT'"

# userinit.sh is sourced on some userdebug ROMs at boot
"${ADB[@]}" shell "
if [ ! -f '$PERSIST' ]; then echo '#!/system/bin/sh' > '$PERSIST'; fi
grep -q mount-r1-ptt-kl '$PERSIST' 2>/dev/null || echo '$INIT_SCRIPT' >> '$PERSIST'
chmod 755 '$PERSIST'
"

say "Restart Android (reload InputReader keymaps)"
"${ADB[@]}" shell "setprop ctl.restart zygote" || "${ADB[@]}" reboot

echo
echo "Done. Side button should send KEYCODE_F1 to OKO (PTT)."
echo "Test: hold side button in OKO, or: adb shell input keyevent 131"
echo "Re-run this script if PTT reverts to power after OTA."
