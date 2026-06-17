import {
  extractSearchQuery,
  formatWebPromptBlock,
  shouldPrefetchWeb,
  type WebSearchResult,
} from "../src/web-search.js";

let failures = 0;

function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

check("extract strips prefix", extractSearchQuery("Wyszukaj w internecie pogodę Wrocław") === "pogodę Wrocław");
check("net intent prefetches", shouldPrefetchWeb("cokolwiek", "net", "") === true);
check(
  "chat skips without keyword",
  shouldPrefetchWeb("opowiedz o kawie", "chat", "") === false,
);
check(
  "chat prefetches weather keyword",
  shouldPrefetchWeb("jaka jest pogoda", "chat", "") === true,
);
check(
  "skip when memory has answer",
  shouldPrefetchWeb("jaka jest pogoda we Wrocławiu", "chat", "pogoda we Wrocławiu słonecznie") === false,
);

const sample: WebSearchResult = {
  query: "test",
  provider: "test",
  summary: "Podsumowanie.",
  hits: [{ title: "Tytuł", url: "https://example.com", snippet: "Snippet." }],
};
const block = formatWebPromptBlock(sample);
check("format includes header", block.includes("WYNIKI WYSZUKIWANIA INTERNETU"));
check("format includes hit", block.includes("Tytuł"));

process.exit(failures === 0 ? 0 : 1);
