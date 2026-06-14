import { classifyIntent } from "../src/intent.js";

const cases: Array<[string, "chat" | "code" | "net"]> = [
  ["Hello GLaDOS, status report", "chat"],
  ["Tell me a joke about cake", "chat"],
  ["Please address the customer", "chat"],
  ["What's the weather like?", "net"],
  ["wyszukaj pogodę w Warszawie", "net"],
  ["napraw błąd w auth.ts", "code"],
  ["fix the failing test in user service", "code"],
  ["zaimplementuj nową funkcję logowania", "code"],
  ["refactor the database layer", "code"],
  ["run the build and commit it", "code"],
  ["otwórz pull request na githubie", "code"],
  ["uruchom workflow w uipath", "code"],
  [
    "Otwórz nowy repozytorium i na kanwie dpd-managera stwórz aplikacje w podobnym stylu do zarządzania delegacjami. Będę ją odpalał w UIPa w tak jak poszednio dpd-manager.",
    "code",
  ],
  ["Spraź moje repozytoria na githabie.", "code"],
];

let failures = 0;
for (const [text, expected] of cases) {
  const got = classifyIntent(text);
  const ok = got === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  [${got}] expected [${expected}]  "${text}"`);
}
console.log(`\n${cases.length - failures}/${cases.length} passed`);
process.exit(failures === 0 ? 0 : 1);
