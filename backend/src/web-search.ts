import type { Config } from "./config.js";
import { logger } from "./logger.js";
import type { Intent } from "./intent.js";

const log = logger("web-search");

export interface WebSearchHit {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResult {
  query: string;
  provider: string;
  summary: string;
  hits: WebSearchHit[];
}

const WEB_QUERY_RE =
  /\b(pogod\w*|prognoz\w*|wiadomo\w*|news|kurs|cena|ceny|aktualn\w*|dzisiaj|dziś|dzis|teraz|w internecie|internecie|google|wyszuk\w*|znajd[zź]\w*|sprawd[zź]\w*|wikipedia|co to jest|kto (?:to|jest)|kiedy|ile koszt|gdzie jest|latest|today|weather|forecast|search|price)\b/i;

const WEB_SKIP_STOPWORDS =
  /^(?:jaka|jaki|jakie|jest|czy|gdzie|kiedy|we|w|na|co|to|the|what|how|dzisiaj|dziś|teraz|proszę|prosze)$/i;

/** When to fetch live web results before answering. */
export function shouldPrefetchWeb(transcript: string, intent: Intent, memoryBlock: string): boolean {
  if (intent === "net") return true;
  if (!WEB_QUERY_RE.test(transcript)) return false;
  if (memoryBlock.trim().length > 0) {
    const q = extractSearchQuery(transcript).toLowerCase();
    const mem = memoryBlock.toLowerCase();
    const tokens = q
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
      .filter((w) => w.length >= 4 && !WEB_SKIP_STOPWORDS.test(w));
    if (tokens.length > 0) {
      const hits = tokens.filter((t) => mem.includes(t));
      if (hits.length >= Math.min(2, tokens.length)) return false;
    }
  }
  return true;
}

export function extractSearchQuery(transcript: string): string {
  let q = transcript.trim();
  q = q.replace(
    /^(?:prosz[eę]|poprosz[eę]|mo[żz]esz|czy mo[żz]esz|ok[oa]|hej| halo| halo,?)\s+/i,
    "",
  );
  q = q.replace(
    /^(?:wyszukaj(?: w internecie)?|znajd[zź](?: w internecie)?|sprawd[zź](?: w internecie)?|google|search for|search)\s+/i,
    "",
  );
  q = q.replace(/[?.!…]+$/g, "").trim();
  return q || transcript.trim();
}

export function formatWebPromptBlock(result: WebSearchResult, maxChars = 6000): string {
  if (!result.hits.length && !result.summary) {
    return "WYSZUKIWANIE INTERNETU: brak wyników — powiedz użytkownikowi wprost, że nie znalazłeś danych online.";
  }
  const header =
    `WYNIKI WYSZUKIWANIA INTERNETU (${result.provider}, zapytanie: «${result.query}») — użyj TYLKO tych faktów, nie wymyślaj:\n`;
  let body = result.summary ? `${result.summary}\n` : "";
  for (const hit of result.hits.slice(0, 6)) {
    const line = `• ${hit.title} — ${hit.snippet} (${hit.url})\n`;
    if ((header + body + line).length > maxChars) break;
    body += line;
  }
  return header + body;
}

export async function searchWeb(query: string, cfg: Config): Promise<WebSearchResult> {
  const q = query.trim();
  if (!q) throw new Error("Puste zapytanie wyszukiwania.");

  if (cfg.serperApiKey) {
    try {
      return await serperSearch(q, cfg.serperApiKey);
    } catch (err) {
      log.warn("Serper failed, falling back to DuckDuckGo", err);
    }
  }

  const ddg = await duckDuckGoSearch(q);
  if (ddg.hits.length > 0 || ddg.summary) return ddg;

  return {
    query: q,
    provider: "duckduckgo",
    summary: "Brak trafnych wyników w wyszukiwarce.",
    hits: [],
  };
}

async function serperSearch(query: string, apiKey: string): Promise<WebSearchResult> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, gl: "pl", hl: "pl", num: 6 }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
  const data = (await res.json()) as {
    answerBox?: { answer?: string; snippet?: string };
    knowledgeGraph?: { title?: string; description?: string };
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  const hits: WebSearchHit[] = (data.organic ?? []).slice(0, 6).map((o) => ({
    title: o.title ?? "Wynik",
    url: o.link ?? "",
    snippet: o.snippet ?? "",
  }));

  const summaryParts: string[] = [];
  if (data.answerBox?.answer) summaryParts.push(data.answerBox.answer);
  else if (data.answerBox?.snippet) summaryParts.push(data.answerBox.snippet);
  if (data.knowledgeGraph?.description) {
    summaryParts.push(`${data.knowledgeGraph.title ?? ""}: ${data.knowledgeGraph.description}`.trim());
  }

  return {
    query,
    provider: "serper",
    summary: summaryParts.join(" ").trim(),
    hits,
  };
}

async function duckDuckGoSearch(query: string): Promise<WebSearchResult> {
  const instant = await duckInstantAnswer(query);
  const htmlHits = await duckHtmlSearch(query);
  const hits = htmlHits.length > 0 ? htmlHits : instant.hits;
  return {
    query,
    provider: "duckduckgo",
    summary: instant.summary,
    hits,
  };
}

async function duckInstantAnswer(query: string): Promise<{ summary: string; hits: WebSearchHit[] }> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return { summary: "", hits: [] };
  const data = (await res.json()) as {
    AbstractText?: string;
    Heading?: string;
    AbstractURL?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string } | { Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
  };

  const summary = [data.Heading, data.AbstractText].filter(Boolean).join(": ");
  const hits: WebSearchHit[] = [];
  if (data.AbstractText && data.AbstractURL) {
    hits.push({
      title: data.Heading ?? query,
      url: data.AbstractURL,
      snippet: data.AbstractText,
    });
  }

  for (const item of data.RelatedTopics ?? []) {
    if ("Topics" in item && item.Topics) {
      for (const sub of item.Topics.slice(0, 3)) {
        if (sub.Text) hits.push({ title: sub.Text.slice(0, 80), url: sub.FirstURL ?? "", snippet: sub.Text });
      }
    } else if ("Text" in item && item.Text) {
      hits.push({ title: item.Text.slice(0, 80), url: item.FirstURL ?? "", snippet: item.Text });
    }
  }

  return { summary, hits: hits.slice(0, 5) };
}

async function duckHtmlSearch(query: string): Promise<WebSearchHit[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "user-agent": "OKO/1.0 (glados-r1 backend)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  const hits: WebSearchHit[] = [];
  const linkRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRe = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  const links = [...html.matchAll(linkRe)];
  const snippets = [...html.matchAll(snippetRe)];

  for (let i = 0; i < Math.min(links.length, 6); i++) {
    const link = links[i];
    const snippetMatch = snippets[i];
    if (!link) continue;
    let rawUrl = link[1] ?? "";
    if (rawUrl.includes("uddg=")) {
      try {
        rawUrl = decodeURIComponent(rawUrl.split("uddg=")[1]?.split("&")[0] ?? rawUrl);
      } catch {
        /* keep raw */
      }
    }
    const title = stripTags(link[2] ?? "");
    const snippet = stripTags(snippetMatch?.[1] ?? "");
    if (title) hits.push({ title, url: rawUrl, snippet });
  }
  return hits;
}

function stripTags(s: string): string {
  return decodeHtmlEntities(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
