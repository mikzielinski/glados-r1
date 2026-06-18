/**
 * Final text cleanup before TTS — builds on polish-language quality layer.
 */
import type { ConversationLang } from "./conversation-lang.js";
import { englishForSpeech } from "./english-language.js";
import { digitsToPolishWords, polishLanguageQuality } from "./polish-language.js";

export { polishLanguageQuality, slmPolishInstructions, digitsToPolishWords } from "./polish-language.js";

/** Sanitize text for TTS based on active conversation language. */
export function prepareForSpeech(raw: string, lang: ConversationLang = "pl"): string {
  return lang === "en" ? englishForSpeech(raw) : polishForSpeech(raw);
}

/** Sanitize + normalize Polish for speaker output. */
export function polishForSpeech(raw: string): string {
  let text = polishLanguageQuality(raw)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/\*\*/g, "")
    .replace(/[#*_~]/g, "")
    .replace(/[«»""]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  text = digitsToPolishWords(text);
  return text;
}
