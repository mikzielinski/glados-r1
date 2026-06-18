# Backend poza Maciem — R1 bez kabla i bez Maca

R1 **nie musi** łączyć się z Maciem. Potrzebuje **osiągalnego backendu** (WebSocket `ws://host:8787/ws`).

```
R1 (LTE / WiFi) ──▶ backend (dowolny host) ──▶ Ollama / Cursor / TTS
                         │
                         ├─ Mac (dev)
                         ├─ VPS / NAS / Raspberry Pi (prod)
                         └─ ten sam LAN co R1
```

## Trzy poziomy

| Poziom | Co działa | Mac potrzebny? |
|--------|-----------|----------------|
| **1. Backend na VPS** | Pełny OKO (STT, SLM, TTS, RAG, kod w chmurze) | Nie |
| **2. Tailscale** | R1 poza domem → backend na VPS lub w domu | Nie (Mac może spać) |
| **3. Tryb offline R1** | Bateria, sieć, powitanie, „backend niedostępny” (Android STT/TTS) | Nie (bez mózgu LLM) |

Helio P35 + 4 GB RAM **nie udźwignie** sensownego LLM na samym R1 — to ograniczenie sprzętu, nie aplikacji.

## 1. VPS / Linux (zalecane)

Na serwerze (Hetzner, OVH, home NAS z Linuxem):

```bash
git clone https://github.com/mikzielinski/glados-r1.git
cd glados-r1
./scripts/setup-linux-backend.sh   # Node, Ollama, systemd
# edytuj backend/.env (CURSOR_API_KEY, FISH_API_KEY, HOST=0.0.0.0)
sudo systemctl enable --now oko-backend
```

Na R1 **SET** → URL:

```
ws://TWOJ.VPS.IP:8787/ws
ws://100.x.x.x:8787/ws    # Tailscale IP VPS
```

Firewall: otwórz **8787/tcp** (albo tylko przez Tailscale — bezpieczniej).

### Wymagania VPS

- **RAM:** min. 8 GB (Bielik 7B q3 ~4 GB + Node + Whisper)
- **CPU:** 4 vCPU wystarczy na SLM; bez GPU Ollama działa wolniej
- **Dysk:** ~10 GB (modele Ollama + Whisper + Piper)

### Tailscale (R1 w terenie)

1. Zainstaluj Tailscale na VPS i na R1 (CipherOS: APK Tailscale)
2. W SET wpisz `ws://100.x.x.x:8787/ws` (MagicDNS: `ws://vps-hostname:8787/ws`)
3. Mac może być wyłączony

## 2. Mac tylko do dev

Produkcja na VPS, Mac do kodu i testów:

```bash
./scripts/install-backend-launchagent.sh   # opcjonalnie na Macu dev
./scripts/wireless-setup-info.sh           # URL-e LAN
```

## 3. Tryb offline na R1 (automatyczny)

Gdy backend nie odpowiada, OKO uruchamia **lokalny** Android SpeechRecognizer + TTS:

- bateria, sieć, powitanie, status backendu
- bez LLM, bez pamięci RAG, bez kodu

Pełna rozmowa wymaga backendu (poziom 1 lub 2).

## Checklist migracji Mac → VPS

1. `rsync` lub `git pull` repo na VPS
2. `./scripts/setup-linux-backend.sh`
3. Skopiuj `backend/.env` z Maca (klucze API, ścieżki modeli)
4. `./scripts/setup-ollama-pl.sh bielik` na VPS
5. `./scripts/setup-whisper-pl.sh` + `./scripts/setup-piper-pl.sh` na VPS
6. `curl http://VPS:8787/health`
7. R1 SET → nowy URL, **Nowa sesja**
8. Wyłącz Mac — sprawdź czy R1 nadal odpowiada
