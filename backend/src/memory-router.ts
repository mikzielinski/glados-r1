import type { AgentSkinId } from "./agent-skins.js";
import type { MemoryStore } from "./memory-store.js";

const LEARN_PREFIXES = [
  /^zapami[eę]taj(?:\s*,?\s*(?:że|ze|to))?[:\s]*/i,
  /^zapamietaj(?:\s*,?\s*(?:ze|to))?[:\s]*/i,
  /^naucz si[eę][:\s]*/i,
  /^naucz sie[:\s]*/i,
  /^dodaj do pami[eę]ci[:\s]*/i,
  /^dodaj do pamieci[:\s]*/i,
  /^zapisz w pami[eę]ci[:\s]*/i,
  /^remember[:\s]*/i,
  /^memorize[:\s]*/i,
];

const LIST_PATTERNS = [
  "co pamiętasz",
  "co pamietasz",
  "pokaż pamięć",
  "pokaz pamiec",
  "lista pamięci",
  "lista pamieci",
  "what do you remember",
  "show memory",
];

const FORCE_PATTERNS = [
  "wymuś naukę",
  "wymus nauke",
  "wymuś uczenie",
  "wymus uczenie",
  "force learn",
];

const CLEAR_PATTERNS = [
  "wyczyść pamięć",
  "wyczysc pamiec",
  "clear memory",
  "usuń pamięć",
  "usun pamiec",
];

const CLEAR_ALL_PATTERNS = [
  "wyczyść całą pamięć",
  "wyczysc cala pamiec",
  "wyczyść wszystko",
  "wyczysc wszystko",
  "usuń całą pamięć",
  "usun cala pamiec",
  "reset pamięci",
  "reset pamieci",
  "clear all memory",
  "wyczyść całą wiedzę",
  "wyczysc cala wiedze",
];

export function parseLearnPayload(transcript: string): string | null {
  const t = transcript.trim();
  for (const re of LEARN_PREFIXES) {
    const m = t.match(re);
    if (m) {
      let rest = t.slice(m[0].length).trim();
      rest = rest.replace(/^(?:że|ze|to)\s+/i, "").trim();
      if (rest.length >= 2) return rest;
    }
  }
  return null;
}

export function isMemoryListQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return LIST_PATTERNS.some((p) => t.includes(p));
}

export function isForceLearnQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return FORCE_PATTERNS.some((p) => t.includes(p));
}

export function isMemoryClearQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  if (CLEAR_ALL_PATTERNS.some((p) => t.includes(p))) return false;
  return CLEAR_PATTERNS.some((p) => t.includes(p));
}

export function isMemoryClearAllQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return CLEAR_ALL_PATTERNS.some((p) => t.includes(p));
}

export async function memoryListReply(
  memory: MemoryStore,
  deviceId: string,
  skin: AgentSkinId,
): Promise<string> {
  const status = await memory.getStatus(deviceId);
  if (status.count === 0) {
    return skin === "tars"
      ? "Pamięć pusta. Dodaj wiedzę w ustawieniach albo powiedz «zapamiętaj, że…»."
      : skin === "glados"
        ? "Niczego nie zapamiętałam. Możesz nauczyć mnie czegoś nowego — albo nie. Twój wybór."
        : "Moja pamięć kontekstowa jest pusta. Możesz dodać wiedzę w ustawieniach OKO albo powiedzieć «zapamiętaj, że…».";
  }
  const lines = status.entries.slice(0, 5).map((e) => e.title);
  const more = status.count > lines.length ? ` …i ${status.count - lines.length} więcej.` : "";
  return skin === "tars"
    ? `Pamiętam ${status.count} wpisów: ${lines.join("; ")}.${more}`
    : skin === "glados"
      ? `Mam ${status.count} wpisów w pamięci. Na przykład: ${lines.join("; ")}.${more}`
      : `Pamiętam ${status.count} wpisów kontekstowych. Ostatnie: ${lines.join("; ")}.${more}`;
}
