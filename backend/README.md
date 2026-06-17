# GLaDOS R1 backend (the brain)

Node + TypeScript service that the R1 connects to.

```
R1 ──ws──▶ session.ts ──▶ stt.ts (Whisper, PL)
                │
                ├── intent: chat/net → SlmBrain (Ollama, local)
                │       + RAG block (when ready) + optional web search
                │
                ├── intent: code → Brain (Cursor SDK + skills + PDF standards)
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
- `OLLAMA_BASE_URL` + `OLLAMA_MODEL` — local chat (e.g. `llama3.2:3b`)
- `WHISPER_BIN` + `WHISPER_MODEL` — STT
- `PIPER_BIN` + voice models — TTS per skin (see `.env.example`)
- `WEB_SEARCH_ENABLED=true` — DuckDuckGo when memory lacks data
- `MEMORY_DIR` — contextual memory JSON store
- `STANDARDS_DIR` — PDF code norms (needs `brew install poppler`)

Optional:

- `RAG_EMBED_MODEL=nomic-embed-text` — Ollama embeddings for semantic RAG search
- `SERPER_API_KEY` — better web results (Google via Serper)
- `N8N_BASE_URL` — resolve relative skill webhooks
- `TTS_FALLBACK=say` — dev-only macOS fallback

## Run

```bash
npm run dev
```

Health: `curl http://localhost:8787/health` (includes `rag` status)

Admin panel: **http://localhost:8787/setup**

Sections: Pulpit · Integracje · Szablony docs · Pamięć · Indeks RAG · Standardy kodu · Skille · Ustawienia

## Routing (intent)

| Intent | Brain | Przykład |
|--------|-------|----------|
| `chat` | Local SLM | rozmowa, fakty urządzenia, wiedza ogólna |
| `net` | Local SLM + web | pogoda, wiadomości, „wyszukaj…” |
| `code` | Cursor SDK | napraw, repo, GitHub, UiPath, standardy PDF |

## Knowledge layers

| Layer | Store | Setup page |
|-------|-------|------------|
| Memory (facts) | `data/memory/*.json` | `/setup#memory` |
| Doc templates | `data/templates/` | `/setup#templates` |
| Code standards | `standards/*.pdf` | `/setup#standards` |

**RAG index** (`data/rag/index.json`) chunks all three sources. When status is **ready**, `session.ts` injects retrieved fragments instead of raw memory dump.

### RAG API

| Method | Path | Opis |
|--------|------|------|
| GET | `/api/setup/rag` | Status, źródła, chunk count |
| POST | `/api/setup/rag/reindex` | Wymuszenie indeksowania `{ "force": true }` |
| POST | `/api/setup/rag/search` | Test `{ "query": "…" }` |
| POST | `/api/setup/knowledge/reset` | Wyczyść całą pamięć + rebuild RAG |

Voice: *status rag*, *wymuś indeksowanie*, *wyczyść całą pamięć*.

Auto-reindex runs after memory/standards/template changes (debounced ~1 s).

## Memory

- Per-device + global (`deviceId=global` from web setup)
- Voice: *„zapamiętaj, że…”*, upload PDF/TXT in R1 SET or `/setup`
- Clear device: *„wyczyść pamięć”* or SET → Wyczyść pamięć
- Clear all + RAG sync: *„wyczyść całą pamięć”* or `/setup` → Reset pamięci + RAG
- Protocol: `memory_learn`, `memory_upload`, `memory_list`, `memory_clear` (optional `scope: "all"`)

**Nowa sesja** on R1 resets SLM chat history only — not long-term memory.

## TARS personality

- Sliders 0–100: honesty, humor, sarcasm — continuous scale in prompts + post-processing
- Voice: *„Tars, ustaw poziom żartu na 60 procent”* → `tars_traits_updated` to R1
- Live code-review asides during cloud `code` turns (skin-specific tone)

## Skills

Registry: `skills/skills.json` (hot-reload). Built-in local endpoints:

- `github_api`, `uipath_orchestrator`, `standards_lookup`, `web_search`

Import custom n8n skills via `/setup` or edit JSON; relative webhooks use `N8N_BASE_URL`.

See [`skills/skills.example.json`](skills/skills.example.json).

## Test

```bash
npm run typecheck
npm test
```

Emulated R1 client:

```bash
BRAIN_MODE=echo TTS_FALLBACK=say npm run dev
node scripts/test-client.mjs "Kim jesteś?"
```

Smoke (live backend):

```bash
../scripts/smoke-test.sh
```

## Protocol

See [`src/protocol.ts`](src/protocol.ts). TEXT = JSON control; BINARY = PCM s16le mono.

## Resuming an agent

Reconnect with `/ws?sessionId=<id>&agentId=<id>`. R1 stores `agentId` from the `ready` message.
