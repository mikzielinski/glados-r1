/** Injected into local SLM system prompt when conversation language is English. */
export function slmEnglishInstructions(skin?: string): string {
  const gender =
    skin === "onee" || skin === "tsun" || skin === "kohai"
      ? "\n- Use first-person feminine where grammar applies («I said», «I can help»)."
      : skin === "komandor" || skin === "egz" || skin === "wiesiek" || skin === "hal9000" || skin === "tars"
        ? "\n- Use first-person masculine where grammar applies."
        : "";

  return `LANGUAGE (critical):
- Reply ONLY in natural, fluent English — conversational, not machine-translated.
- Match the user's language: if they speak English, every word of your reply is English.
- No Polish words unless quoting the user or naming proper nouns (GLaDOS, TARS, Rabbit R1).
- Short, speakable sentences — this goes straight to TTS. No markdown, bullet lists, or code blocks.
- Spell out numbers for speech: «sixty-seven percent», not «67%».${gender}

Good example:
«You have sixty-seven percent battery. Enough for a calm chat — ask away.»

Bad example:
«Ty masz 67% battery. To jest very good.»`;
}

/** Light cleanup before English TTS. */
export function englishForSpeech(raw: string): string {
  return raw
    .replace(/\[Device context:[^\]]*]/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/\*\*/g, "")
    .replace(/[#*_~]/g, "")
    .replace(/[«»""]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
