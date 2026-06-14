#!/usr/bin/env bash
# Build the GLaDOS R1 Android client and install it on a connected R1.
#
# Prereqs (one-time):
#   - R1 flashed with CipherOS, ADB enabled, reachable (USB or `adb connect <tailscale-ip>:5555`).
#   - Android SDK installed (ANDROID_HOME set) and JDK 17 on PATH.
#   - `adb` on PATH (brew install android-platform-tools).
#
# Usage:
#   scripts/deploy-r1.sh [adb-serial] [backend-ws-url]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERIAL="${1:-}"
BACKEND_URL="${2:-}"

# Default toolchain paths (Homebrew install locations). Override by exporting
# ANDROID_HOME / JAVA_HOME before running.
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

ADB=(adb); [ -n "$SERIAL" ] && ADB=(adb -s "$SERIAL")

command -v adb >/dev/null || { echo "adb not found. brew install android-platform-tools"; exit 1; }

echo "== Devices =="
"${ADB[@]}" devices -l
"${ADB[@]}" get-state >/dev/null 2>&1 || { echo "No R1 reachable over adb. Connect USB or 'adb connect <ip>:5555'."; exit 1; }

echo "== Building debug APK (JDK 17) =="
( cd "$ROOT/android" && ./gradlew --no-daemon assembleDebug )

APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
[ -f "$APK" ] || { echo "APK not found at $APK"; exit 1; }

echo "== Installing =="
"${ADB[@]}" install -r "$APK"

echo "== Launching =="
"${ADB[@]}" shell am start -n tech.glados.r1/.MainActivity

if [ -n "$BACKEND_URL" ]; then
  echo "Set the backend URL on-device (long-press the URL label) to: $BACKEND_URL"
fi
echo "Done. Grant the microphone permission on first launch."
