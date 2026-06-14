# GLaDOS R1 Agent

Turn a (bootloader-unlocked) **Rabbit R1** running **CipherOS** into a hands-free,
GLaDOS-flavoured voice client for an AI coding agent.

The R1 is a thin client: it captures push-to-talk audio, streams it to a
**backend "brain"** running on your Mac, and plays back the spoken reply. The
brain does speech-to-text and text-to-speech locally, and delegates any real
work with code/repos to a [Cursor SDK](https://cursor.com/docs/sdk/typescript)
agent wearing a GLaDOS persona.

```
PTT button ─▶ R1 (Kotlin app) ──WebSocket/Tailscale──▶ Backend (Node/TS)
                                                          ├─ Whisper (STT, local)
                                                          ├─ Cursor SDK agent ─▶ your repo
                                                          └─ Piper (GLaDOS TTS, local)
R1 speaker ◀── audio + status ◀──────────────────────────┘
```

## Repository layout

| Path          | What it is                                                          |
| ------------- | ------------------------------------------------------------------- |
| `backend/`    | Node + TypeScript "brain": WebSocket server, STT, TTS, Cursor agent |
| `android/`    | Native Kotlin app that runs on the R1 (the voice client)            |
| `r1-flash/`   | Procedure + helper scripts to flash CipherOS, enable ADB, Tailscale |

## Quick start

1. **Flash the R1** with CipherOS and enable ADB + Tailscale: see
   [`r1-flash/README.md`](r1-flash/README.md). This is a physical, one-time
   step you run against the device.
2. **Run the backend** on your Mac: see [`backend/README.md`](backend/README.md).
3. **Build & install the Android client** onto the R1: see
   [`android/README.md`](android/README.md).

## Extending GLaDOS with skills (n8n)

GLaDOS gains new abilities through **n8n workflows** surfaced to the agent as
callable tools — no backend code required. Build a workflow with a webhook
trigger, add an entry to `backend/skills/skills.json`, and GLaDOS can invoke it
mid-conversation (e.g. "turn on the office lights", "send a Slack message").
The registry hot-reloads, so new skills take effect on the next utterance. See
[`backend/README.md`](backend/README.md#skills-extend-glados-via-n8n).

## Hardware constraints that shaped the design

- Helio P35 / 4 GB RAM: the R1 cannot run an LLM locally, so all AI lives on the Mac.
- No volume buttons: fastboot entry needs the MediaTek preloader path (see flashing docs).
- One side button = push-to-talk **and** power: the app distinguishes a hold from a tap.
- Scroll wheel emits `KEY_UP`/`KEY_DOWN` (DPAD) for on-screen navigation.
- Tailscale runs on CipherOS, so the R1 reaches the Mac securely even over LTE.

> Unlocking the bootloader permanently voids the R1 warranty.
