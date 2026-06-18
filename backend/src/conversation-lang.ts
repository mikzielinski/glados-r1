/** Conversation language selected on the R1 (settings) or backend default. */
export type ConversationLang = "pl" | "en";

export function normalizeConversationLang(raw: unknown): ConversationLang {
  if (typeof raw === "string" && raw.toLowerCase().startsWith("en")) return "en";
  return "pl";
}

export function isEnglishLang(lang: ConversationLang): boolean {
  return lang === "en";
}
