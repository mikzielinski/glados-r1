/**
 * Sanitize text before Piper TTS — strip markdown and leaked context tags.
 * Does not truncate; full SLM replies are spoken.
 */
export function polishForSpeech(raw: string): string {
  return raw
    .replace(/\[Device context:[^\]]*]/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/\*\*/g, "")
    .replace(/[#*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
