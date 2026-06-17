#!/system/bin/sh
# Launch OKO after boot (runs as root from userinit.sh — BAL exempt).
sleep 12
cmd statusbar collapse 2>/dev/null
input keyevent KEYCODE_WAKEUP 2>/dev/null
wm dismiss-keyguard 2>/dev/null
am start -n tech.glados.r1/.MainActivity
