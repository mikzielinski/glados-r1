# OKO / GLaDOS R1

Voice agent for **Rabbit R1** (CipherOS) with three agent skins: **HAL 9000**, **GLaDOS**, and **TARS**.

The R1 is a thin client — it captures push-to-talk audio, streams it to a backend on your Mac, and plays the spoken reply. Speech-to-text and text-to-speech run locally; harder tasks (code, GitHub, web) go to a [Cursor SDK](https://cursor.com/docs/sdk/typescript) agent with the active persona.

**Repository:** [github.com/mikzielinski/glados-r1](https://github.com/mikzielinski/glados-r1)

```
PTT (lens / side button) ─▶ R1 Kotlin app ──WebSocket──▶ Backend (Node/TS)
                                                           ├─ Whisper STT (PL)
                                                           ├─ Ollama SLM / Cursor agent
                                                           └─ TTS (Fish / Piper + FX)
R1 speaker ◀── PCM 48 kHz + status ◀─────────────────────┘
```

## Screenshots

| HAL 9000 | GLaDOS | TARS |
|----------|--------|------|
| ![HAL-9000 HUD](docs/screenshots/oko-hal.png) | ![GLaDOS HUD](docs/screenshots/oko-glados.png) | ![TARS HUD](docs/screenshots/oko-tars.png) |

**TARS personality sliders** (szczerość / humor / sarkazm) — słychać różnicę w szablonach i w SLM:

![Ustawienia TARS](docs/screenshots/oko-settings-tars.png)

## Features

- **3 skórki agenta** — HAL / GLaDOS / TARS: persona, kolory HUD, pipeline głosu
- **Polski TTS** — Fish PL (GLaDOS), Piper `darkman` + FX (HAL/TARS)
- **Hybrid brain** — rozmowa ogólna lokalnie (Ollama SLM); kod/GitHub/UiPath w chmurze (Cursor SDK)
- **Web search** — DuckDuckGo / opcjonalnie Serper, gdy brak danych lokalnych
- **Pamięć kontekstowa** — głos + PDF/TXT w SET (R1) lub panelu web (`/setup`)
- **TARS sliders** — szczerość / humor / sarkazm (0–100), ciągła skala tonu
- **TARS głosem** — *„Tars, ustaw poziom żartu na 60%”* → animacja HUD + potwierdzenie
- **Setup web** — GitHub, UiPath, pamięć, skille n8n: `http://<backend>:8787/setup`
- **Kiosk R1** — opcjonalny autostart OKO (`scripts/setup-r1-kiosk.sh`)
- **Skills** — lokalne (GitHub, UiPath, standards, web_search) + import n8n

## Voice pipeline (TTS)

| Skin | Model (PL) | FX |
|------|------------|-----|
| **GLaDOS** | Fish PL clone (lub Gosia + portal ring-mod) | portal FX, depth ~0.10 |
| **HAL** | `pl_PL-darkman-medium` | pitch −3.5 st, tempo 0.80, ring-mod 40 Hz |
| **TARS** | `pl_PL-darkman-medium` | pitch −1 st, ring-mod 60 Hz + dry flanger |

Konfiguracja: `backend/.env` — patrz [`backend/.env.example`](backend/.env.example).

## Repository layout

| Path | Opis |
|------|------|
| [`backend/`](backend/) | WebSocket brain: STT, TTS, SLM, Cursor agent, sesje |
| [`android/`](android/) | Aplikacja OKO na R1 (Kotlin) |
| [`design/oko/`](design/oko/) | Design system, lens shapes, skin kit |
| [`scripts/`](scripts/) | Deploy APK, Piper/Whisper setup, restart backend |
| [`docs/screenshots/`](docs/screenshots/) | Zrzuty ekranu do README |

> Flash CipherOS / ADB: tooling w `r1-flash/` (duży vendored bundle — nie w repo; sklonuj osobno jeśli potrzebujesz).

## Quick start

### 1. Backend (Mac)

```bash
cd backend
cp .env.example .env   # uzupełnij CURSOR_API_KEY, FISH_API_KEY, ścieżki modeli
npm install
npm run dev
```

Szczegóły: [`backend/README.md`](backend/README.md).

### 2. Modele (jednorazowo)

```bash
./scripts/setup-whisper-pl.sh
./scripts/setup-piper-pl.sh darkman
./scripts/setup-piper-pl.sh gosia
./scripts/setup-ollama-pl.sh
```

### 3. Android → R1

```bash
./scripts/deploy-r1.sh <serial>   # build + install + launch
```

Na R1: **SET** → backend URL, skórka, suwaki TARS, pamięć, **Nowa sesja**.

Panel integracji (Mac): `http://<ip-mac>:8787/setup`

Szczegóły: [`android/README.md`](android/README.md).

## Sterowanie na R1

| Akcja | Gest |
|-------|------|
| Mów (PTT) | Przytrzymaj **oko / lens** |
| Zdjęcie dla agenta | Long-press na lens |
| Transkrypt | Kółko góra/dół |
| Ustawienia | **SET** (prawy górny róg) |
| Przerwij chmurę | Powiedz „przerwij” w trakcie PRACUJE |

## Hardware notes

- Helio P35 / 4 GB — LLM tylko na Macu (Ollama lokalnie + Cursor w chmurze)
- Tailscale na CipherOS → R1 łączy się z backendem po tailnecie
- Side button wymaga `scripts/fix-r1-side-button.sh` (KEYCODE_POWER → PTT)

> Odblokowanie bootloadera voiduje gwarancję R1.

## License

Private / experimental — use at your own risk.
