import type { AgentSkinId } from "./agent-skins.js";
import type { DocTemplateStore } from "./doc-templates.js";

const LIST_PATTERNS = [
  "lista szablonów",
  "lista szablonow",
  "pokaż szablony",
  "pokaz szablony",
  "jakie szablony",
  "jakie mamy szablony",
  "show templates",
];

export function isTemplateListQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return LIST_PATTERNS.some((p) => t.includes(p));
}

export async function templateListReply(
  templates: DocTemplateStore,
  skin: AgentSkinId,
): Promise<string> {
  const list = await templates.list();
  if (list.length === 0) {
    return skin === "tars"
      ? "Brak szablonów dokumentacji. Dodaj je w panelu setup — sekcja Szablony."
      : skin === "glados"
        ? "Nie mam żadnych szablonów dokumentacji. Możesz je dodać w kreatorze integracji — jeśli uważasz, że warto."
        : "Nie mam zdefiniowanych szablonów dokumentacji. Dodaj je w setup OKO, krok Szablony.";
  }
  const names = list.slice(0, 6).map((t) => t.name);
  const more = list.length > names.length ? ` …i ${list.length - names.length} więcej.` : "";
  return skin === "tars"
    ? `Mamy ${list.length} szablonów docs: ${names.join(", ")}.${more}`
    : skin === "glados"
      ? `${list.length} szablonów dokumentacji: ${names.join(", ")}.${more}`
      : `Zarejestrowałem ${list.length} szablonów dokumentacji: ${names.join(", ")}.${more}`;
}
