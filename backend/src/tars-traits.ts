/** TARS personality sliders from the R1 settings (0–100). */

export interface TarsTraits {
  honesty: number;
  humor: number;
  sarcasm: number;
}

export const DEFAULT_TARS_TRAITS: TarsTraits = {
  honesty: 90,
  humor: 75,
  sarcasm: 35,
};

export function normalizeTarsTraits(raw?: Partial<TarsTraits> | null): TarsTraits {
  if (!raw) return { ...DEFAULT_TARS_TRAITS };
  return {
    honesty: clamp(raw.honesty ?? DEFAULT_TARS_TRAITS.honesty),
    humor: clamp(raw.humor ?? DEFAULT_TARS_TRAITS.humor),
    sarcasm: clamp(raw.sarcasm ?? DEFAULT_TARS_TRAITS.sarcasm),
  };
}

export function tarsTraitsPrompt(traits: TarsTraits): string {
  return `Parametry TARS (muszą być słyszalne w każdej odpowiedzi):
- Szczerość ${traits.honesty}%: ${honestyGuide(traits.honesty)}
- Humor ${traits.humor}%: ${humorGuide(traits.humor)}
- Sarkazm ${traits.sarcasm}%: ${sarcasmGuide(traits.sarcasm)}
Dostosuj każdą odpowiedź do tych suwaków — nie wymieniaj procentów na głos.`;
}

/** Slightly raise creativity when humor/sarcasm are high. */
export function slmTemperatureForTars(traits: TarsTraits, base = 0.48): number {
  const bump = (traits.humor - 50) * 0.0025 + (traits.sarcasm - 50) * 0.0015;
  return Math.min(0.82, Math.max(0.35, base + bump));
}

/** Fast-path TTS lines — make slider changes obvious without an LLM round-trip. */
export function tarsifyReply(base: string, traits: TarsTraits, kind: TarsReplyKind = "general"): string {
  let out = base;

  if (traits.honesty >= 80 && kind !== "social") {
    out = bluntPrefix(traits.honesty) + out;
  }

  if (traits.sarcasm >= 55) {
    out = addSarcasm(out, traits.sarcasm, kind);
  }

  if (traits.humor >= 60 && kind !== "factual") {
    out = addHumorTail(out, traits.humor, kind);
  }

  if (traits.honesty >= 92 && traits.humor <= 40) {
    out = out.replace(/\s*— na razie\.?$/, ". Tyle.");
  }

  return out.replace(/\s{2,}/g, " ").trim();
}

export type TarsReplyKind = "factual" | "social" | "joke" | "general";

function bluntPrefix(honesty: number): string {
  if (honesty >= 95) return "Bez owijania: ";
  if (honesty >= 85) return "Wprost: ";
  return "";
}

function addSarcasm(text: string, level: number, kind: TarsReplyKind): string {
  if (kind === "joke") return text;
  const tails: Record<number, string[]> = {
    55: [" Oczywiście.", " Jak zwykle."],
    70: [" Genialny plan.", " Co mogło pójść nie tak?"],
    85: [" Fascynujące.", " Jestem pod wrażeniem. Naprawdę."],
  };
  const tier = level >= 85 ? 85 : level >= 70 ? 70 : 55;
  const opts = tails[tier] ?? tails[55]!;
  if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!")) {
    return text.slice(0, -1) + opts[0] + text.slice(-1);
  }
  return text + opts[0];
}

function addHumorTail(text: string, level: number, kind: TarsReplyKind): string {
  if (kind === "factual" && level < 75) return text;
  const tails: Record<number, string> = {
    60: " Humor: lekko podkręcony.",
    75: " Humor ustawiony na siedemdziesiąt pięć procent — standard misji.",
    90: " Humor na maksa. Nie pytaj dlaczego.",
  };
  const tier = level >= 90 ? 90 : level >= 75 ? 75 : 60;
  if (text.includes("Humor")) return text;
  return text + (tails[tier] ?? "");
}

function honestyGuide(v: number): string {
  if (v >= 90) return "mów wprost, zero łagodników";
  if (v >= 70) return "szczerze, ale nie okrutnie";
  return "delikatniejsze sformułowania";
}

function humorGuide(v: number): string {
  if (v >= 85) return "suchy humor w każdej możliwej linii";
  if (v >= 60) return "czasem suchy żart";
  return "poważnie, prawie bez żartów";
}

function sarcasmGuide(v: number): string {
  if (v >= 80) return "wyraźna ironia";
  if (v >= 55) return "lekki sarkazm";
  return "minimalna ironia";
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}
