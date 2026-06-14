# GLaDOS R1 Android client

Native Kotlin app that runs on the (CipherOS) Rabbit R1 and acts as the voice
client for the backend brain.

## What it does

- **Push-to-talk:** hold the on-screen lens button, or the side button **after**
  running `./scripts/fix-r1-side-button.sh` (see below). On stock CipherOS the
  side button is **KEYCODE_POWER** and Android handles it as power — OKO never
  receives it.
- **Streams microphone audio** (16 kHz mono PCM16) to the backend over a
  WebSocket while you hold.
- **Plays back** the GLaDOS TTS audio that streams back.
- **Scroll wheel** (DPAD up/down) scrolls the transcript log — scrolls the `ScrollView`, not just the text field.
- **Auto-reconnects** with backoff and **resumes** the agent across reconnects
  (the backend hands back an `agentId`, stored in `Prefs`).

## Configure the backend URL

The default is `ws://glados-mac:8787/ws` (a Tailscale hostname). Change it by:

- long-pressing the URL label at the bottom of the screen on-device, or
- editing `Prefs.DEFAULT_URL` in
  [`app/src/main/java/tech/glados/r1/Prefs.kt`](app/src/main/java/tech/glados/r1/Prefs.kt).

Use the Mac's Tailscale IP/hostname so the R1 reaches it over the tailnet.

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

Uncomment the `HOME`/`DEFAULT` intent-filter in
[`app/src/main/AndroidManifest.xml`](app/src/main/AndroidManifest.xml), rebuild,
reinstall, then pick GLaDOS R1 as the default Home app in CipherOS settings.

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
| `GladosClient.kt`| OkHttp WebSocket, reconnect/backoff, agent resume         |
| `AudioEngine.kt` | `AudioRecord` capture + streaming `AudioTrack` playback   |
| `Protocol.kt`    | JSON control messages (mirror of backend `protocol.ts`)   |
| `Prefs.kt`       | backend URL, stable sessionId, resumable agentId          |
