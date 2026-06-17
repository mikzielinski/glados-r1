# GLaDOS R1 backend (the brain)

Node + TypeScript service that the R1 connects to.

```
R1 ──ws──▶ session.ts ──▶ stt.ts (Whisper, PL)
                │
                ├── intent: chat/net → SlmBrain (Ollama, local)
                │       + memory block + optional web search
                │
                ├── intent: code → Brain (Cursor SDK + skills)
                │
                └── tts.ts (Fish / Piper + skin FX) ──ws──▶ R1
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
- `HOST` / `PORT` — bind address (LAN IP so the R1 can reach it)

Recommended:

- `BRAIN_MODE=hybrid` — SLM locally, cloud agent for `code` intent
- `OLLAMA_BASE_URL` + `OLLAMA_MODEL` — local chat (e.g. `gemma3:4b`)
- `WHISPER_BIN` + `WHISPER_MODEL` — STT
- `PIPER_BIN` + voice models — TTS per skin (see `.env.example`)
- `WEB_SEARCH_ENABLED=true` — DuckDuckGo when memory lacks data
- `MEMORY_DIR` — contextual memory JSON store

Optional:

- `SERPER_API_KEY` — better web results (Google via Serper)
- `N8N_BASE_URL` — resolve relative skill webhooks
- `TTS_FALLBACK=say` — dev-only macOS fallback

## Run

```bash
npm run dev
```

Health: `curl http://localhost:8787/health`

Setup wizard (GitHub, UiPath, memory, skills): **http://localhost:8787/setup**

## Routing (intent)

| Intent | Brain | Przykład |
|--------|-------|----------|
| `chat` | Local SLM | rozmowa, fakty urządzenia, wiedza ogólna |
| `net` | Local SLM + web | pogoda, wiadomości, „wyszukaj…” |
| `code` | Cursor SDK | napraw, repo, GitHub, UiPath, standardy PDF |

## Memory

- Per-device + global (`deviceId=global` from web setup)
- Voice: *„zapamiętaj, że…”*, upload PDF/TXT in R1 SET or `/setup`
- Protocol: `memory_learn`, `memory_upload`, `memory_list`, `memory_clear`

## TARS personality

- Sliders 0–100: honesty, humor, sarcasm — continuous scale in prompts + post-processing
- Voice: *„Tars, ustaw poziom żartu na 60 procent”* → `tars_traits_updated` to R1

## Skills

Registry: `skills/skills.json` (hot-reload). Built-in local endpoints:

- `github_api`, `uipath_orchestrator`, `standards_lookup`, `web_search`

Import custom n8n skills via `/setup` or edit JSON; relative webhooks use `N8N_BASE_URL`.

See [`skills/skills.example.json`](skills/skills.example.json).

## Test

```bash
npm test
```

Emulated R1 client:

```bash
BRAIN_MODE=echo TTS_FALLBACK=say npm run dev
node scripts/test-client.mjs "Kim jesteś?"
```

## Protocol

See [`src/protocol.ts`](src/protocol.ts). TEXT = JSON control; BINARY = PCM s16le mono.

## Resuming an agent

Reconnect with `/ws?sessionId=<id>&agentId=<id>`. R1 stores `agentId` from the `ready` message.
