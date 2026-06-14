# Standardy PDF (GLaDOS)

Wrzuć tutaj swoje standardy firmowe jako pliki **`.pdf`**.

Backend przy starcie wyciąga tekst (`pdftotext` z pakietu poppler) i podaje go agentowi chmurowemu przy pracy z kodem, GitHubem i UiPath.

```bash
brew install poppler   # jednorazowo — pdftotext
cp ~/Downloads/Moje-Standardy.pdf standards/
./scripts/restart-backend.sh
```

Sprawdź w logu: `standard loaded: Moje-Standardy.pdf`

W `.env` ustaw `BRAIN_MODE=hybrid` — rozmowa na R1 lokalnie, kod/integracje w chmurze (Cursor + skilli n8n).
