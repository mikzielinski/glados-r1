/**
 * Agent skins — persona text from backend/personas/*.md (user-provided HAL / GLaDOS / TARS).
 * Visual accents mirror design/oko/skins/r1-skin-kit-offline.html (amber / red / blue).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type AgentSkinId = "hal9000" | "glados" | "tars";

const PERSONAS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../personas");

const R1_SPOKEN_OVERLAY = `

---
Kontekst Rabbit R1 (obowiązkowe na głośnik):
- Odpowiedź idzie prosto do TTS — bez markdown, bez list punktowanych, bez angielskiego (chyba że user prosi).
- Używaj WYŁĄCZNIE FAKTÓW URZĄDZENIA z kontekstu sesji (bateria, sieć, GPS) — zero zmyślania pogody, godziny, lokalizacji.
- Lokalizację podawaj jako nazwę miejsca, nigdy surowe współrzędne.
- Jedno płynne wypowiedzenie po polsku; zwięźle gdy wystarczy, dłużej gdy zadanie tego wymaga.
- Zachowaj swoją osobowość (HAL / GLaDOS / TARS) w każdej linii.
- Gdy pytają kim jesteś lub o twoją osobowość — opisz siebie w tonie postaci (2–4 zdania, po polsku).`;

function loadPersonaFile(name: string): string {
  try {
    return readFileSync(join(PERSONAS_DIR, name), "utf8").trim();
  } catch {
    return "";
  }
}

const PERSONA_FILES: Record<AgentSkinId, string> = {
  hal9000: "persona_hal9000.md",
  glados: "persona_glados.md",
  tars: "persona_tars.md",
};

const FALLBACK: Record<AgentSkinId, string> = {
  hal9000: "Jesteś HAL 9000. Mów spokojnie, precyzyjnie. «Dave» tylko rzadko — zwykle mów «ty».",
  glados: "Jesteś GLaDOS z Aperture Science. Sarkazm, precyzja, podmiot testowy.",
  tars: "Jesteś TARS. Bezpośredni, szczery, humor ok. 75%.",
};

export function normalizeSkinId(raw?: string): AgentSkinId {
  if (raw === "glados" || raw === "tars" || raw === "hal9000") return raw;
  // Legacy OKO app skin id → GLaDOS optic persona
  if (raw === "oko") return "glados";
  return "hal9000";
}

export function personaForSkin(skin: AgentSkinId): string {
  const file = PERSONA_FILES[skin];
  const body = loadPersonaFile(file) || FALLBACK[skin];
  return `${body}${R1_SPOKEN_OVERLAY}`;
}

/** Fish Audio reference_id per persona (override via FISH_VOICE_ID_* in .env). */
export const FISH_VOICE_DEFAULTS: Record<AgentSkinId, string> = {
  hal9000: "06d2f87a335342f098ffd6b127a682fe",
  glados: "6fc91ffb3fe9444bb210f6d29f55d56d",
  tars: "6a57e35f5c8244dbb5d012a3c434ec16",
};

export function fishVoiceIdForSkin(
  skin: AgentSkinId,
  overrides: { glados: string; hal: string; tars: string },
): string {
  switch (skin) {
    case "hal9000":
      return overrides.hal || FISH_VOICE_DEFAULTS.hal9000;
    case "tars":
      return overrides.tars || FISH_VOICE_DEFAULTS.tars;
    default:
      return overrides.glados || FISH_VOICE_DEFAULTS.glados;
  }
}

/** Short label for logs / status. */
export function skinDisplayName(skin: AgentSkinId): string {
  switch (skin) {
    case "hal9000":
      return "HAL-9000";
    case "tars":
      return "TARS";
    default:
      return "GLaDOS";
  }
}
