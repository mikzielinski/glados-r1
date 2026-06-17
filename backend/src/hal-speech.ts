import type { AgentSkinId } from "./agent-skins.js";

/** Strip HAL «Dave» unless the user explicitly set their name to Dave in memory. */
export function sanitizeHalSpeech(
  text: string,
  skin: AgentSkinId,
  preferredName?: string,
): string {
  if (skin !== "hal9000" || !text.trim()) return text;
  if (preferredName?.trim().toLowerCase() === "dave") return text;

  let out = text;
  out = out.replace(/\b[Dd]ave\b/g, "ty");
  out = out.replace(/,\s*ty([.!?…]|$)/gi, "$1");
  out = out.replace(/(^|[.!?…]\s*)ty,\s*/gi, "$1");
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}
