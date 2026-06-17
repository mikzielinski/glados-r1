import {
  humorGuide,
  honestyGuide,
  normalizeTarsTraits,
  sarcasmGuide,
  shapeTarsSpeech,
  type TarsTraits,
} from "./tars-traits.js";

export type TarsTraitKey = "honesty" | "humor" | "sarcasm";

export interface TarsTraitChangeRequest {
  trait: TarsTraitKey;
  /** Absolute 0–100 or delta points when mode=delta. */
  value: number;
  mode: "set" | "delta";
  /** +1 increase, -1 decrease (delta only). */
  deltaSign?: 1 | -1;
}

function detectTrait(t: string): TarsTraitKey | null {
  if (/humor|żart|zart|smiesz|śmiesz|smiech/i.test(t)) return "humor";
  if (/szczer|honesty|wprost/i.test(t)) return "honesty";
  if (/sarkazm|iron/i.test(t)) return "sarcasm";
  return null;
}

const COMMAND_RE =
  /\b(tars|ustaw|poziom|konfigur|zwi[eę]ksz|zmniejsz|podnie[sś]|obni[zż]|reguluj|zmie[nń])\b/i;

/** Voice command to adjust TARS sliders, e.g. «Tars ustaw poziom żartu na 60%». */
export function parseTarsTraitCommand(transcript: string): TarsTraitChangeRequest | null {
  const raw = transcript.trim();
  if (raw.length < 6) return null;
  const t = raw.toLowerCase();
  if (!COMMAND_RE.test(t)) return null;

  const trait = detectTrait(t);
  if (!trait) return null;

  const deltaUp = /\b(zwi[eę]ksz|podnie[sś]|do g[oó]ry|raise|increase|up)\b/i.test(t);
  const deltaDown = /\b(zmniejsz|obni[zż]|reduce|decrease|down)\b/i.test(t);
  const nums = [...t.matchAll(/(\d{1,3})\s*(?:%|procent|proc\.?)?/g)].map((m) => clampInt(m[1]!));

  if ((deltaUp || deltaDown) && nums.length > 0) {
    return {
      trait,
      value: nums[nums.length - 1]!,
      mode: "delta",
      deltaSign: deltaDown ? -1 : 1,
    };
  }

  if (nums.length === 0) return null;
  return { trait, value: nums[nums.length - 1]!, mode: "set" };
}

export function applyTarsTraitChange(
  current: TarsTraits,
  req: TarsTraitChangeRequest,
): { traits: TarsTraits; from: number; to: number } {
  const base = normalizeTarsTraits(current);
  const from = base[req.trait];
  let to = req.mode === "delta" ? from + req.value * (req.deltaSign ?? 1) : req.value;
  to = clampInt(String(to));
  return {
    traits: { ...base, [req.trait]: to },
    from,
    to,
  };
}

export function tarsTraitChangeReply(
  trait: TarsTraitKey,
  from: number,
  to: number,
  traits: TarsTraits,
): string {
  const label = traitLabelPl(trait);
  const comment = traitChangeComment(trait, to, traits);
  const delta =
    from === to
      ? `${label} już jest na ${to} procentach.`
      : `${label} ${from} → ${to} procent.`;
  const body = `Gotowe. ${delta} ${comment}`.trim();
  return shapeTarsSpeech(body, traits, "template", "social");
}

export function tarsTraitUnknownReply(transcript: string, traits: TarsTraits): string {
  const body =
    "Nie rozpoznałem ustawienia. Powiedz na przykład: «Tars, ustaw poziom żartu na sześćdziesiąt procent» albo «ustaw szczerość na dziewięćdziesiąt».";
  if (/\btars\b/i.test(transcript) && /ustaw|poziom/i.test(transcript)) {
    return shapeTarsSpeech(
      "Słyszę polecenie konfiguracji, ale nie wiem którego suwaka. Szczerość, humor czy sarkazm?",
      traits,
      "template",
      "social",
    );
  }
  return shapeTarsSpeech(body, traits, "template", "social");
}

function traitChangeComment(trait: TarsTraitKey, value: number, traits: TarsTraits): string {
  switch (trait) {
    case "honesty":
      return `Od teraz mówię ${honestyGuide(value).replace(/\s*\(\d+\/100\)/, "")}.`;
    case "humor":
      return `Humor ustawiony — ${humorGuide(value).replace(/\s*\(\d+\/100\)/, "")}.`;
    case "sarcasm":
      return `Sarkazm — ${sarcasmGuide(value).replace(/\s*\(\d+\/100\)/, "")}.`;
  }
}

function traitLabelPl(trait: TarsTraitKey): string {
  switch (trait) {
    case "honesty":
      return "Szczerość";
    case "humor":
      return "Humor";
    case "sarcasm":
      return "Sarkazm";
  }
}

function clampInt(raw: string | number): number {
  const n = typeof raw === "number" ? raw : parseInt(raw, 10);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}
