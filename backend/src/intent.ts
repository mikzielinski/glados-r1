/**
 * Lightweight intent routing before the brain:
 *   chat — local Ollama SLM on your Mac (no internet)
 *   net  — local SLM too (no live web; say so honestly)
 *   code — Cursor SDK in the cloud (repo tools only)
 *
 * Matching is token-based (not substring) so generic words don't trigger false
 * positives — e.g. "report" must not match "repo", "address" must not match
 * "add".
 */

export type Intent = "chat" | "code" | "net";

/** Whole-word keywords (a token must equal one of these). */
const CODE_EXACT = new Set([
  // English
  "fix", "bug", "bugs", "error", "errors", "debug", "refactor", "implement",
  "add", "remove", "rename", "test", "tests", "build", "compile", "run",
  "commit", "lint", "function", "file", "files", "class", "repo", "code",
  "deploy", "install", "import", "merge", "exception", "failing", "review",
  "pr", "trace", "github", "gitlab", "git", "branch", "push", "pull",
  "uipath", "orchestrator", "workflow", "rpa", "automation", "standard",
  "standards", "pdf",
  // Polish (base forms)
  "napraw", "popraw", "błąd", "blad", "błędy", "bledy", "dodaj", "usuń", "usun",
  "zmień", "zmien", "test", "testy", "zbuduj", "skompiluj", "uruchom", "commit",
  "plik", "pliki", "repo", "kod", "zainstaluj", "scal", "wyjątek", "wyjatek",
  "przejrzyj", "standard", "standardy", "norma", "normy", "automatyzac", "integrac",
  "githab", "githaba", "githubie", "githabie", "repozytorium", "repozytoria",
  "uipa", "aplikacja", "aplikacje", "kanwa", "kanwie", "studio", "stwórz", "stworz",
  "otwórz", "otworz", "delegacja", "delegacje", "projekt", "projektu",
]);

const NET_EXACT = new Set([
  // English
  "google", "search", "weather", "forecast", "news", "internet", "online",
  "browse", "website", "url", "http", "download", "wiki", "wikipedia",
  // Polish
  "wyszukaj", "znajdź", "znajdz", "pogoda", "prognoza", "wiadomości",
  "wiadomosci", "internecie", "strona", "pobierz",
]);

/** Stem prefixes (a token starting with one of these counts). */
const CODE_STEMS = [
  "implement", "refactor", "debug", "compil", "github", "gitlab", "githab", "uipath",
  "uipa", "repozytor", "aplikac", "kanw", "delegac", "stwor", "otwor", "tworz",
  "zaimplement", "refaktor", "funkcj", "klas", "wdroż", "wdroz", "deboug",
  "standard", "automat", "integr", "orchestr", "projekt",
];

const NET_STEMS = ["wyszuk", "googl", "pogod", "wiadomo", "intern"];

const TOKEN_RE = /[\p{L}]+/gu;

export function classifyIntent(transcript: string): Intent {
  const tokens = transcript.toLowerCase().match(TOKEN_RE) ?? [];
  for (const tok of tokens) {
    if (CODE_EXACT.has(tok)) return "code";
    for (const stem of CODE_STEMS) {
      if (tok.startsWith(stem)) return "code";
    }
  }
  for (const tok of tokens) {
    if (NET_EXACT.has(tok)) return "net";
    for (const stem of NET_STEMS) {
      if (tok.startsWith(stem)) return "net";
    }
  }
  return "chat";
}

/** Cloud agent: repo work, GitHub, UiPath, standards-backed engineering. */
export function needsCloudBrain(intent: Intent): boolean {
  return intent === "code" || intent === "net";
}

/** Status label shown on the R1 while thinking. */
export function brainStatusLabel(intent: Intent): string {
  return needsCloudBrain(intent) ? "cloud" : "slm";
}
