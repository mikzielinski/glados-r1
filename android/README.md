# GLaDOS R1 Android client

Native Kotlin app that runs on the (CipherOS) Rabbit R1 and acts as the voice
client for the backend brain.

## What it does

- **Push-to-talk:** hold the on-screen lens button, or the side button **after**
  running `./scripts/fix-r1-side-button.sh` (see below). On stock CipherOS the
  side button is **KEYCODE_POWER** and Android handles it as power — OKO never
  receives it.
- **Agent skins** — HAL-9000, GLaDOS, TARS (SET → radio + TARS sliders)
- **TARS voice config** — say *„Tars, ustaw poziom żartu na 60%”* (animated HUD overlay)
- **Contextual memory** — learn, upload PDF/TXT, force-learn, clear (SET → Pamięć)
- **Offline resilience** — `pause`/`reconnectNow` on lifecycle; tap status/hint to force reconnect; boot retry
- **Memory reset** — device-only or full (all profiles + RAG sync) with confirmation dialogs in SET
- **Streams microphone audio** (16 kHz mono PCM16) to the backend over WebSocket while you hold.
- **Plays back** TTS audio for the active skin.
- **Scroll wheel** (DPAD up/down) scrolls the transcript log — scrolls the `ScrollView`, not just the text field.
- **Auto-reconnects** with backoff and **resumes** the agent across reconnects
  (the backend hands back an `agentId`, stored in `Prefs`). On disconnect the UI
  clears busy/TTS state so PTT is not stuck after backend loss.

## Configure the backend URL (wireless)

No USB cable is required for daily use — only for initial APK install.

In **SET**, enter **one WebSocket URL per line**. The client tries each until one connects:

```
ws://192.168.0.170:8787/ws
ws://100.x.x.x:8787/ws
ws://glados-mac:8787/ws
```

Run on the Mac: `./scripts/wireless-setup-info.sh` to print your LAN/Tailscale URLs.

The app remembers the last working URL and prefers it on reconnect.

## Build

You need the Android SDK (API 34). Easiest path is Android Studio:

1. Open the `android/` folder in Android Studio.
2. Let it sync, then Run/Build to produce an APK.

From the command line (the Gradle wrapper is committed, so use `./gradlew`).
The build needs JDK 17 and the Android SDK. If you used the Homebrew setup:

```bash
cd android
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export PATH="$JAVA_HOME/bin:$PATH"
./gradlew assembleDebug
```

The debug APK lands in `app/build/outputs/apk/debug/app-debug.apk`.

Easiest of all: `scripts/deploy-r1.sh` builds, installs, and launches in one
go (it sets these toolchain paths for you).

## Install on the R1

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n tech.glados.r1/.MainActivity
```

Grant the microphone permission when prompted.

## Make it the launcher (optional kiosk)

```bash
./scripts/setup-r1-kiosk.sh <serial>   # HOME launcher + boot hook
./scripts/unfix-r1-side-button.sh <serial>   # revert side-button remap if needed
```

Or uncomment the `HOME` intent-filter in [`AndroidManifest.xml`](app/src/main/AndroidManifest.xml), rebuild, reinstall, pick OKO as Home app.

## Side button (PTT) on CipherOS

On Rabbit R1 the **side button is the same physical key as power**. Stock RabbitOS
had custom firmware: short press = PTT, long press = shutdown. **CipherOS uses
standard Android**: the key is `KEYCODE_POWER`, caught by the system (power menu /
screen off) **before** any normal app sees it.

OKO listens for `KEYCODE_F1` (after keylayout remap) and `KEYCODE_POWER` (fallback).
Diagnostic on device:

```bash
# Simulated power — app goes to background, no PTT (system wins):
adb shell input keyevent 26

# After fix-r1-side-button.sh — should trigger PTT in OKO:
adb shell input keyevent 131
```

Fix (needs `adb root`, userdebug CipherOS):

```bash
./scripts/fix-r1-side-button.sh <serial>
```

This remaps POWER → F1 via keylayout overlay. `/system` is often **100% full** on
CipherOS; the script bind-mounts from `/data`. After a reboot you may need to run
it again until keylayout is baked into a reflash.

Until then: **hold the on-screen lens button** to talk.

## Source map

| File             | Responsibility                                            |
| ---------------- | --------------------------------------------------------- |
| `MainActivity.kt`| UI, PTT (hardware + on-screen), scroll wheel, lifecycle   |
| `GladosClient.kt`| OkHttp WebSocket, reconnect/backoff/pause, agent resume         |
| `BootLaunchService.kt` | Retry MainActivity launch after device boot (kiosk)      |
| `AudioEngine.kt` | `AudioRecord` capture + streaming `AudioTrack` playback   |
| `Protocol.kt`    | JSON control messages (mirror of backend `protocol.ts`)   |
| `Prefs.kt`       | backend URL, stable sessionId, resumable agentId          |
