# Standardy PDF (OKO)

Normy firmowe dla **agenta chmurowego** (code review, refaktor, GitHub, UiPath).

## Sposób 1 — panel setup (zalecane)

1. Zainstaluj poppler: `brew install poppler`
2. Otwórz **http://&lt;ip-mac&gt;:8787/setup#standards**
3. Kliknij **Dodaj PDF standardu**

Backend zapisuje plik tutaj i od razu indeksuje tekst (`pdftotext`).

## Sposób 2 — ręcznie

```bash
brew install poppler   # jednorazowo
cp ~/Downloads/Moje-Standardy.pdf standards/
./scripts/restart-backend.sh
```

Sprawdź w logu: `standard loaded: Moje-Standardy.pdf`

## Przykład

W repo jest `OKO-Code-Review-Przyklad.pdf` — demo do testów. Zastąp własnymi normami.

## Konfiguracja (.env)

```
STANDARDS_DIR=/Users/you/glados-r1/standards
STANDARDS_MAX_CHARS=14000
```

## Różnica: standardy vs pamięć

| | Standardy PDF | Pamięć globalna |
|--|---------------|-----------------|
| Cel | Obowiązkowe reguły kodu | Wzorce docs, fakty, notatki |
| Upload | `/setup#standards` | `/setup#memory` |
| Kto używa | Agent chmurowy (`code`) | SLM + agent chmurowy |
