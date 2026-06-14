# GLaDOS R1 backend (the brain)

Node + TypeScript service that the R1 connects to. It:

1. Accepts a WebSocket connection from the R1 at `/ws`.
2. Buffers push-to-talk microphone audio, runs **Whisper** locally (STT).
3. Sends the transcript to a **Cursor SDK** agent (bound to your repo) wearing
   the GLaDOS persona — for chat *and* real code/debug work.
4. Synthesizes the spoken reply with **Piper** in a GLaDOS voice (TTS) and
   streams the audio back.

```
R1  ──ws──▶  server.ts ──▶ session.ts ──▶ stt.ts (Whisper)
                                   │
                                   ├──▶ brain.ts (Cursor SDK agent → your repo)
                                   │
                                   └──▶ tts.ts (Piper, GLaDOS voice) ──ws──▶ R1
```

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then edit values
```

Required env:

- `CURSOR_API_KEY` — from <https://cursor.com/dashboard/integrations>
- `REPO_PATH` — absolute path to the repo the agent should work in
- `HOST` / `PORT` — bind address (use your Tailscale IP so the R1 can reach it)

Optional (voice). Without these the pipeline still runs, just in mock mode:

- `WHISPER_BIN` + `WHISPER_MODEL` — a `whisper.cpp` CLI + ggml model for STT
- `PIPER_BIN` + `PIPER_MODEL` — Piper + a GLaDOS `.onnx` voice for TTS
- `TTS_FALLBACK=say` — dev-only macOS `say` fallback when Piper isn't installed

### Installing the voice tools (macOS)

```bash
# Whisper (speech-to-text)
brew install whisper-cpp
# download a model, e.g. base.en, and point WHISPER_MODEL at it

# Piper (text-to-speech). Install the binary, then grab a GLaDOS voice .onnx
# (community voices exist) and point PIPER_MODEL at it.
```

## Run

```bash
npm run dev        # watch mode (tsx)
# or
npm run build && npm start
```

Health check: `curl http://localhost:8787/health`

## Test without the R1 hardware

Run the backend in `echo` brain mode (no API key/repo needed) with the macOS
`say` fallback for audio, then drive it with the emulated client:

```bash
# terminal 1 — backend
BRAIN_MODE=echo TTS_FALLBACK=say npm run dev

# terminal 2 — emulated R1 client
node scripts/test-client.mjs "napraw błąd w auth.ts"
# writes the spoken reply to glados-reply.wav
```

Point the test client at a Tailscale host to validate the remote link:
`node scripts/test-client.mjs "status report" ws://glados-mac:8787/ws`.

Unit test for intent routing: `npm test`.

## Protocol

See [`src/protocol.ts`](src/protocol.ts). TEXT frames are JSON control
messages; BINARY frames are raw PCM (s16le, mono) — microphone audio up,
GLaDOS audio down.

## Skills (extend GLaDOS via n8n)

GLaDOS gains new abilities through **n8n workflows** exposed to the agent as
callable tools. Adding a skill needs **no backend code** — build the workflow
in n8n, then add an entry to the skills registry.

1. In n8n, create a workflow with a **Webhook** trigger (note its URL/path),
   do whatever the skill should do, and **Respond to Webhook** with a short
   result the agent can read back.
2. Copy [`skills/skills.example.json`](skills/skills.example.json) to
   `skills/skills.json` (the path in `SKILLS_FILE`) and add your skill:

```json
{
  "skills": [
    {
      "name": "office_lights",
      "description": "Turn the office lights on or off.",
      "webhook": "webhook/office-lights",
      "method": "POST",
      "inputSchema": {
        "type": "object",
        "properties": { "state": { "type": "string", "enum": ["on", "off"] } },
        "required": ["state"]
      }
    }
  ]
}
```

- `webhook` may be a full URL or a path resolved against `N8N_BASE_URL`.
- `description` + `inputSchema` are how the agent decides when/how to call it.
- `N8N_AUTH_HEADER` (e.g. `X-Secret: abc123`) is sent with every skill call.

The registry **reloads automatically when `skills.json` changes** — adding a
skill takes effect on the next utterance, no restart. Each turn, the current
skills are passed to the agent as Cursor SDK custom tools
(`local.customTools`), so GLaDOS can invoke them mid-conversation and speak the
result.

```
"GLaDOS, turn on the office lights"
  -> agent picks the office_lights tool
  -> POST {state:"on"} to the n8n webhook
  -> n8n flips the lights, responds
  -> GLaDOS: "Done. Let there be light. Try not to waste it."
```

## Resuming an agent

The R1 can reconnect and keep its conversation by connecting to
`/ws?sessionId=<id>&agentId=<id>`. The backend calls `Agent.resume(...)` with
that ID. The R1 learns its `agentId` from the `ready` message on first connect.

## Notes

- Local vs cloud: this uses the **local** runtime (`local.cwd = REPO_PATH`), so
  the agent runs on this machine against your checkout.
- Startup failures (`CursorAgentError`) vs run failures (`result.status` ===
  `"error"`) are handled separately in `brain.ts` / `session.ts`.
