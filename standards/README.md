# Standardy PDF (OKO)

Normy firmowe dla **agenta chmurowego** (code review, refaktor, GitHub, UiPath).

Agent cytuje je **w stylu aktywnej skórki** (HAL / GLaDOS / TARS). Tekst trafia też do **indeksu RAG** (`/setup#rag`).

## Wymagania

**Poppler** na Macu (narzędzie `pdftotext`):

```bash
brew install poppler
```

Panel `/setup#standards` pokazuje status: zielony = OK, czerwony = brak poppler.

Bez poppler PDF zapisze się na dysk, ale agent nie dostanie treści (0 znaków w tabeli).

## Sposób 1 — panel setup (zalecane)

1. Otwórz **http://&lt;ip-mac&gt;:8787/setup#standards**
2. Kliknij **+ Dodaj PDF**
3. Sprawdź kolumnę **Tekst** — powinno być &gt; 0 znaków
4. W **Indeks RAG** kliknij **Wymuś indeksowanie** (lub poczekaj na auto-indeks)

## Sposób 2 — ręcznie

```bash
brew install poppler   # jednorazowo
cp ~/Downloads/Moje-Standardy.pdf standards/
./scripts/restart-backend.sh
```

Sprawdź w logu: `standard loaded: Moje-Standardy.pdf (… chars)`

## Przykład

W repo jest `OKO-Code-Review-Przyklad.pdf` — demo do testów. Zastąp własnymi normami.

## Konfiguracja (.env)

```
STANDARDS_DIR=/Users/you/glados-r1/standards
STANDARDS_MAX_CHARS=14000
```

## Trzy kubełki wiedzy — nie mylić

| | Standardy PDF | Szablony docs | Pamięć |
|--|---------------|---------------|--------|
| **Cel** | Obowiązkowe reguły kodu | Wzorce README, procedur | Fakty, notatki użytkownika |
| **Format** | PDF | Nazwa + treść w panelu | Tekst / upload pliku |
| **Upload** | `/setup#standards` | `/setup#templates` | `/setup#memory` |
| **Kto używa** | Agent chmurowy (`code`) | Generowanie dokumentacji | SLM + agent |
| **W RAG** | tak | tak | tak |

Usunięcie standardu: przycisk **Usuń** w tabeli → auto-reindeks RAG.

Pełny reset pamięci (**Reset pamięć + RAG**) **nie usuwa** PDF-ów ani szablonów — tylko wpisy pamięci.
