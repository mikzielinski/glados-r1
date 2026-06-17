/**
 * Final text cleanup before TTS — builds on polish-language quality layer.
 */
import { digitsToPolishWords, polishLanguageQuality } from "./polish-language.js";

export { polishLanguageQuality, slmPolishInstructions, digitsToPolishWords } from "./polish-language.js";

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
