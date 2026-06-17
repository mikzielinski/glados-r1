/**
 * Agent skins — persona text from backend/personas/*.md (HAL / GLaDOS / TARS + OKO vol.2).
 * Visual accents mirror design/oko/skins/ (amber / red / blue + vol.2 palette).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type AgentSkinId =
  | "hal9000"
  | "glados"
  | "tars"
  | "onee"
  | "tsun"
  | "kohai"
  | "komandor"
  | "egz"
  | "wiesiek";

export const VOL2_SKINS: readonly AgentSkinId[] = [
  "onee",
  "tsun",
  "kohai",
  "komandor",
  "egz",
  "wiesiek",
];

export function isVol2Skin(skin: AgentSkinId): boolean {
  return (VOL2_SKINS as readonly string[]).includes(skin);
}

export function isVol2FemaleSkin(skin: AgentSkinId): boolean {
  return skin === "onee" || skin === "tsun" || skin === "kohai";
}

export function isVol2MaleSkin(skin: AgentSkinId): boolean {
  return skin === "komandor" || skin === "egz" || skin === "wiesiek";
}

const ALL_SKINS: readonly AgentSkinId[] = ["hal9000", "glados", "tars", ...VOL2_SKINS];

const PERSONAS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../personas");

const R1_SPOKEN_OVERLAY = `

---
Kontekst Rabbit R1 (obowiązkowe na głośnik):
- Odpowiedź idzie prosto do TTS — bez markdown, bez list punktowanych, bez angielskiego (chyba że user prosi).
- Rozmawiasz po polsku na DOWOLNY temat — nie tylko programowanie. Kod to jeden z wielu tematów.
- Dla baterii/sieci/GPS używaj WYŁĄCZNIE FAKTÓW URZĄDZENIA z kontekstu sesji — zero zmyślania tych liczb.
- Lokalizację podawaj jako nazwę miejsca, nigdy surowe współrzędne.
- Jedno płynne wypowiedzenie po polsku; zwięźle gdy wystarczy, dłużej gdy pytanie tego wymaga.
- Zachowaj swoją osobowość postaci w każdej linii — ton, słownictwo, charakter.
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
  onee: "persona_onee.md",
  tsun: "persona_tsun.md",
  kohai: "persona_kohai.md",
  komandor: "persona_komandor.md",
  egz: "persona_egz.md",
  wiesiek: "persona_wiesiek.md",
};

const FALLBACK: Record<AgentSkinId, string> = {
  hal9000: "Jesteś HAL 9000. Mów spokojnie, precyzyjnie. Zwracaj się «ty». NIGDY «Dave».",
  glados: "Jesteś GLaDOS z Aperture Science. Sarkazm, precyzja, podmiot testowy.",
  tars: "Jesteś TARS. Bezpośredni, szczery, humor ok. 75%.",
  onee: "Jesteś On-Ē — ciepła onee-san. «Ara ara», spokojnie, troskliwie.",
  tsun: "Jesteś tsundere — ostra zewnętrznie, pomocna w środku. «Hm…», «b-baka» oszczędnie.",
  kohai: "Jesteś entuzjastyczny kōhai. «Senpai!», szybko, zachwycony.",
  komandor: "Jesteś Kapitan — bombastyczny dowódca misji. Sebek, Janusz, absurd bez wulgaryzmów.",
  egz: "Jesteś egzorcysta — zmęczony, deadpan. «Dwie stówy», «bez faktury taniej».",
  wiesiek: "Jesteś Pan Wiesio — majster na oko. «Krzyżyczki», «na oko», leniwy fachowiec.",
};

export function normalizeSkinId(raw?: string): AgentSkinId {
  if (raw && (ALL_SKINS as readonly string[]).includes(raw)) return raw as AgentSkinId;
  if (raw === "oko") return "glados";
  return "hal9000";
}

export function personaForSkin(skin: AgentSkinId): string {
  const file = PERSONA_FILES[skin];
  const body = loadPersonaFile(file) || FALLBACK[skin];
  return `${body}${R1_SPOKEN_OVERLAY}`;
}

/** Fish Audio reference_id per persona (override via FISH_VOICE_ID_* in .env). Vol.2 → nearest classic voice. */
export const FISH_VOICE_DEFAULTS: Record<AgentSkinId, string> = {
  hal9000: "06d2f87a335342f098ffd6b127a682fe",
  glados: "6fc91ffb3fe9444bb210f6d29f55d56d",
  tars: "6a57e35f5c8244dbb5d012a3c434ec16",
  onee: "6fc91ffb3fe9444bb210f6d29f55d56d",
  tsun: "6fc91ffb3fe9444bb210f6d29f55d56d",
  kohai: "6fc91ffb3fe9444bb210f6d29f55d56d",
  komandor: "06d2f87a335342f098ffd6b127a682fe",
  egz: "06d2f87a335342f098ffd6b127a682fe",
  wiesiek: "06d2f87a335342f098ffd6b127a682fe",
};

export function fishVoiceIdForSkin(
  skin: AgentSkinId,
  overrides: { glados: string; hal: string; tars: string },
): string {
  switch (skin) {
    case "hal9000":
    case "komandor":
    case "egz":
    case "wiesiek":
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
    case "onee":
      return "On-Ē";
    case "tsun":
      return "Tsundere";
    case "kohai":
      return "Kōhai";
    case "komandor":
      return "Kapitan";
    case "egz":
      return "Egzorcysta";
    case "wiesiek":
      return "Pan Wiesio";
    default:
      return "GLaDOS";
  }
}
