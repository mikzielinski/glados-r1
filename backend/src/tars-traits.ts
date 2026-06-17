/** TARS personality sliders from the R1 settings (0–100). Continuous scaling, not fixed tiers. */

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

export type TarsReplyKind = "factual" | "social" | "joke" | "general";

/** Normalized trait 0..1 from slider 0..100. */
export function trait01(v: number): number {
  return clamp(v) / 100;
}

export function normalizeTarsTraits(raw?: Partial<TarsTraits> | null): TarsTraits {
  if (!raw) return { ...DEFAULT_TARS_TRAITS };
  return {
    honesty: clamp(raw.honesty ?? DEFAULT_TARS_TRAITS.honesty),
    humor: clamp(raw.humor ?? DEFAULT_TARS_TRAITS.humor),
    sarcasm: clamp(raw.sarcasm ?? DEFAULT_TARS_TRAITS.sarcasm),
  };
}

export function tarsTraitsPrompt(traits: TarsTraits): string {
  const h = traits.honesty;
  const hu = traits.humor;
  const s = traits.sarcasm;
  return `AKTYWNA KONFIGURACJA TARS (suwaki 0–100 — każdy punkt ma znaczenie, skaluj ton płynnie):
- Szczerość ${h}%: ${honestyGuide(h)}
- Humor ${hu}%: ${humorGuide(hu)}
- Sarkazm ${s}%: ${sarcasmGuide(s)}

Zasady (ciągła skala, nie skokowe progi):
1. Nie czytaj procentów na głos — odzwierciedl je stylem.
2. Im wyższa szczerość, tym mniej «może/chyba/wydaje mi się» i tym krócej do sedna.
3. Im niższa szczerość, tym łagodniejsze, ostrożniejsze sformułowania.
4. Im wyższy humor, tym więcej suchych żartów ( proporcjonalnie do suwaka ).
5. Im wyższy sarkazm, tym mocniejsza ironia ( proporcjonalnie do suwaka ).
6. Przy humorze i sarkazmie bliskim zeru — poważnie, bez żartów.

Przykład przy DOKŁADNIE tej konfiguracji (${h}/${hu}/${s}):
U: Ile mam baterii? [FAKTY: battery=67%]
TARS: ${tarsBatteryExample(67, traits)}`;
}

export function tarsChatInstructions(traits: TarsTraits): string {
  return `Tryb: ROZMOWA ogólna na Rabbit R1. Brzmij jak TARS — ${honestyGuide(traits.honesty)}, ${humorGuide(traits.humor)}, ${sarcasmGuide(traits.sarcasm)}.
Skaluj ton liniowo do suwaków (${traits.honesty}/${traits.humor}/${traits.sarcasm}). Dla urządzenia: tylko fakty z systemu.`;
}

export function tarsFewShots(traits: TarsTraits): string {
  return `Przykłady stylu TARS (szczerość=${traits.honesty} humor=${traits.humor} sarkazm=${traits.sarcasm}):

U: Ile mam baterii?  [FAKTY: battery=67%]
TARS: ${tarsBatteryExample(67, traits)}

U: Kim jesteś?
TARS: ${tarsWhoAmIExample(traits)}

U: Opowiedz o sobie.
TARS: ${tarsPersonalityDescription(traits)}

U: Cześć
TARS: ${tarsGreetingExample(traits)}

U: Opowiedz mi o kawie
TARS: ${tarsCoffeeExample(traits)}`;
}

export function tarsPersonalityDescription(traits: TarsTraits): string {
  const h = traits.honesty;
  const hu = traits.humor;
  const s = traits.sarcasm;
  const parts: string[] = [];
  if (h >= 75) parts.push("mówię wprost");
  else if (h >= 50) parts.push("szczerze, ale bez okrucieństwa");
  else if (h >= 25) parts.push("ostrożnie i z wyczuciem");
  else parts.push("delikatnie, dyplomatycznie");

  if (hu >= 75) parts.push("dużo suchego humoru");
  else if (hu >= 50) parts.push("czasem suchy żart");
  else if (hu >= 25) parts.push("minimalny humor");
  else parts.push("prawie bez żartów");

  if (s >= 75) parts.push("mocna ironia");
  else if (s >= 50) parts.push("lekki sarkazm");
  else if (s >= 25) parts.push("odrobina ironii");
  else parts.push("bez sarkazmu");

  return `TARS — taktyczny system adaptacyjny. Suwaki: szczerość ${h}, humor ${hu}, sarkazm ${s}. Brzmię ${parts.join(", ")} — im ruszysz suwak, tym wyraźniej to słychać.`;
}

export function tarsBatteryReply(pct: number, traits: TarsTraits): string {
  return tarsBatteryExample(pct, traits);
}

export function tarsJokeReply(traits: TarsTraits): string {
  const hu = trait01(traits.humor);
  const s = trait01(traits.sarcasm);
  const h = trait01(traits.honesty);

  if (hu <= 0.12) {
    return h >= 0.65
      ? pickScaled(h, [
          "Bez żartów — humor blisko zera. Następne pytanie.",
          "Humor wyłączony suwakiem. Idziemy dalej.",
          "Bez żartów. Prosto i na temat.",
        ])
      : pickScaled(1 - hu, [
          "Humor mam wyłączony. Mogę pomóc czymś innym.",
          "Bez żartów — wolisz chyba poważnie.",
        ]);
  }

  const jokes = [
    "Mam jeden żart. Nie jest dobry. Pasuje do tej sytuacji.",
    "Ten żart byłby gorszy niż twój ostatni deploy — więc oszczędzę ci obu.",
    "Twój ostatni commit i ten żart — oba lepiej nie pokazywać szefowi.",
    "Gdyby żart był bugiem, miałby priorytet critical — i nadal byś go ignorował.",
    "To byłby żart. Jakości twojego ostatniego hotfixa — ale żart.",
  ];
  const blend = Math.min(1, hu * 0.65 + s * 0.35);
  return pickScaled(blend, jokes);
}

/** Creativity scales linearly with humor/sarcasm; drops slightly when very blunt + low humor. */
export function slmTemperatureForTars(traits: TarsTraits, base = 0.48): number {
  const h = trait01(traits.honesty);
  const hu = trait01(traits.humor);
  const s = trait01(traits.sarcasm);
  const creative = (hu - 0.5) * 0.1 + (s - 0.5) * 0.06;
  const blunt = (h - 0.5) * -0.05 * (1 - hu);
  return Math.min(0.85, Math.max(0.32, base + creative + blunt));
}

export function tarsifyReply(base: string, traits: TarsTraits, kind: TarsReplyKind = "general"): string {
  return shapeTarsSpeech(base, traits, "template", kind);
}

/** Shape spoken TARS output — intensity scales with exact slider values. */
export function shapeTarsSpeech(
  base: string,
  traits: TarsTraits,
  source: "template" | "llm",
  kind: TarsReplyKind = "general",
): string {
  let out = base.trim();
  if (!out) return out;

  const h = trait01(traits.honesty);
  const hu = trait01(traits.humor);
  const s = trait01(traits.sarcasm);

  if (h >= 0.5) out = stripHedging(out);
  else if (h < 0.5 && kind !== "factual") out = softenTone(out, 0.5 - h);

  const prefixAt = source === "template" ? 0.62 : 0.72;
  if (h >= prefixAt && kind !== "social" && !hasBluntOpener(out)) {
    out = honestyPrefix(h) + out;
  }

  if (s > 0.15 && kind !== "joke") {
    out = addSarcasmScaled(out, s, source);
  }

  const humorMin = kind === "factual" ? 0.45 : 0.12;
  if (hu > humorMin) {
    out = addHumorScaled(out, hu, source, kind);
  } else if (hu <= 0.15) {
    out = stripHumorMeta(out);
  }

  if (h >= 0.82 && hu <= 0.42) {
    out = out.replace(/\s*— na razie\.?$/, pickScaled(h - hu, [". OK.", ". Tyle.", ". Koniec wiadomości."]));
  }

  return out.replace(/\s{2,}/g, " ").trim();
}

function tarsBatteryExample(pct: number, traits: TarsTraits): string {
  const h = trait01(traits.honesty);
  const hu = trait01(traits.humor);
  const s = trait01(traits.sarcasm);

  if (h <= 0.48) {
    return pickScaled(0.48 - h, [
      `Możliwe, że masz około ${pct} procent baterii — bez paniki.`,
      `Chyba około ${pct} procent — na razie powinno wystarczyć.`,
      `Wygląda na to, że masz około ${pct} procent baterii — spokojnie.`,
    ]);
  }

  if (h >= 0.88 && hu <= 0.38) {
    return pickScaled(h - hu, [`${pct} procent.`, `${pct} procent. Tyle.`, `${pct}.`]);
  }

  const core = pickScaled(h, [
    `Około ${pct} procent baterii.`,
    `${pct} procent.`,
    `${pct} procent baterii.`,
  ]);

  const sarcEnd = pickScaled(s, [
    "",
    " Jak zwykle — na styk.",
    " Ciekawa strategia oszczędzania.",
    " Genialny plan ładowania.",
    " Fascynujące planowanie energii.",
  ]);
  const funnyEnd = pickScaled(hu, [
    "",
    " Ledwo starcza — jak deadline.",
    " Więcej niż w twoim ostatnim sprintcie.",
    " Na tyle, żeby dojść do ładowarki. Teoretycznie.",
  ]);
  const neutralEnd = pickScaled(1 - Math.max(s, hu), [
    " Powinno starczyć.",
    " Wystarczy — na razie.",
    "",
  ]);

  if (s >= hu && s >= 0.2) return core + sarcEnd;
  if (hu > s && hu >= 0.2) return core + funnyEnd;
  return core + neutralEnd;
}

function tarsWhoAmIExample(traits: TarsTraits): string {
  const h = trait01(traits.honesty);
  const hu = trait01(traits.humor);
  return pickScaled(hu * 0.7 + h * 0.3, [
    "TARS. Taktyczny system adaptacyjny. Pomagam ci ogarniać chaos.",
    "TARS — taktyczny system adaptacyjny. Bezpośredni, adaptacyjny, skuteczny.",
    "TARS. Taktyczny system adaptacyjny. Pomagam ci nie zginąć — w kodzie i nie tylko.",
    "TARS — taktyczny system adaptacyjny. Bez mnie byłbyś szybszy… ale też byś nie wiedział, czemu wszystko padło.",
    "TARS. Taktyczny system adaptacyjny. Lądujemy w każdym temacie — nie tylko w repozytorium.",
  ]);
}

function tarsGreetingExample(traits: TarsTraits): string {
  const h = trait01(traits.honesty);
  const hu = trait01(traits.humor);
  const s = trait01(traits.sarcasm);
  const t = hu * 0.45 + s * 0.35 + h * 0.2;
  return pickScaled(t, [
    "Jestem. Co robimy?",
    "Jestem. Pytaj.",
    "Jestem. Kolejne zadanie?",
    "Jestem. Znowu my — ekscytujące.",
    "Jestem. Zadanie.",
  ]);
}

function tarsCoffeeExample(traits: TarsTraits): string {
  const h = trait01(traits.honesty);
  const hu = trait01(traits.humor);
  const base = pickScaled(h, [
    "Zmiel ziarna tuż przed parzeniem, woda około dziewiędziesięciu stopni, proporcja mniej więcej jedna piętnastka.",
    "Świeżo zmielone ziarna, woda około dziewiędziesięciu stopni, jedna piętnastka na filiżankę.",
    "Mielona świeżo, dziewięćdziesiąt stopni, jedna piętnastka. Reszta to powtarzalność.",
  ]);
  const quip = pickScaled(hu, [
    "",
    " Reszta to praktyka.",
    " Reszta to praktyka — jak z nawykiem, tylko smaczniej.",
    " Reszta to praktyka — jak debugowanie, tylko przyjemniejsze.",
  ]);
  return base + quip;
}

function honestyPrefix(h: number): string {
  if (h < 0.62) return "";
  return pickScaled((h - 0.62) / 0.38, [
    "Szczerze: ",
    "Wprost: ",
    "Bez owijania: ",
    "Bez owijania, konkretnie: ",
  ]);
}

function hasBluntOpener(text: string): boolean {
  return /^(bez owijania|wprost|szczerze|mówiąc wprost)/i.test(text);
}

const HEDGING_RE =
  /^(?:może|moze|być może|byc moze|chyba|wydaje mi się|wydaje mi sie|myślę,? że|mysle,? ze|z tego co wiem,? |raczej |prawdopodobnie )+/i;

function stripHedging(text: string): string {
  const stripped = text.replace(HEDGING_RE, "").trim();
  if (!stripped || stripped === text.trim()) return stripped;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function softenTone(text: string, strength: number): string {
  if (strength <= 0 || /^(może|moze|chyba|wydaje|możliwe|być może)/i.test(text)) return text;
  const prefix = pickScaled(strength, [
    "Być może ",
    "Możliwe, że ",
    "Chyba że ",
    "Z tego co rozumiem, ",
  ]);
  return prefix + text.charAt(0).toLowerCase() + text.slice(1);
}

const SARCASM_TAILS = [
  " Jak zwykle.",
  " Oczywiście.",
  " Ciekawe.",
  " Genialny plan.",
  " Co mogło pójść nie tak?",
  " Fascynujące.",
  " Jestem pod wrażeniem.",
  " Jestem pod wrażeniem. Naprawdę.",
  " Kapitalny pomysł. Serio.",
  " Mistrzowski ruch. Naprawdę.",
];

function addSarcasmScaled(text: string, s: number, source: "template" | "llm"): string {
  const tail = pickScaled(Math.max(0, (s - 0.15) / 0.85), SARCASM_TAILS);
  if (!tail.trim() || text.includes(tail.trim())) return text;
  if (source === "llm" && text.length > 340 && s < 0.55) return text;
  return appendBeforePunctuation(text, tail);
}

const HUMOR_TEMPLATE_TAILS = [
  " Lekko.",
  " Suchy żart w cenie.",
  " Humor lekko podkręcony.",
  " Suchy humor — standard misji.",
  " Humor mocniejszy. Nie pytaj.",
  " Humor blisko maksa.",
  " Humor na maksa. Przetrwasz.",
];

const HUMOR_LLM_TAILS = [
  " Krótko i na temat — rzadkość.",
  " Bez żartów byłoby nudno — trochę.",
  " Stack trace i tak dłuższy niż ta odpowiedź.",
  " Gdyby kod był tak zwięzły — byłby gotowy.",
  " Debugging olimpijski — miałbyś brąz.",
  " Więcej sensu niż większość komentarzy w kodzie.",
  " To był żart. Hotfix klasy premium — ale żart.",
  " Śmiej się teraz — potem wracamy do tematu.",
  " Suchy jak README bez instalacji.",
  " Żart suchy jak staging bez danych.",
];

function addHumorScaled(
  text: string,
  hu: number,
  source: "template" | "llm",
  kind: TarsReplyKind,
): string {
  const pool = source === "template" ? HUMOR_TEMPLATE_TAILS : HUMOR_LLM_TAILS;
  const effective = kind === "factual" ? Math.max(0, hu - 0.35) / 0.65 : hu;
  if (effective <= 0.05) return text;
  const tail = pickScaled(effective, pool);
  if (!tail.trim() || text.includes(tail.trim().slice(0, 10))) return text;
  if (source === "llm" && text.length > 380 && hu < 0.65) return text;
  return text + tail;
}

function appendBeforePunctuation(text: string, tail: string): string {
  if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!")) {
    return text.slice(0, -1) + tail + text.slice(-1);
  }
  return text + tail;
}

function stripHumorMeta(text: string): string {
  return text
    .replace(/\s*Humor[^.?!]*[.?!]?/gi, "")
    .replace(/\s*Lekki humor[^.?!]*[.?!]?/gi, "")
    .replace(/\s*Suchy żart[^.?!]*[.?!]?/gi, "")
    .trim();
}

export function honestyGuide(v: number): string {
  const t = trait01(v);
  if (t >= 0.85) return `bardzo wprost (${v}/100)`;
  if (t >= 0.65) return `raczej wprost (${v}/100)`;
  if (t >= 0.45) return `umiarkowanie (${v}/100)`;
  if (t >= 0.25) return `ostrożnie (${v}/100)`;
  return `delikatnie (${v}/100)`;
}

export function humorGuide(v: number): string {
  const t = trait01(v);
  if (t >= 0.85) return `dużo suchego humoru (${v}/100)`;
  if (t >= 0.65) return `wyraźny humor (${v}/100)`;
  if (t >= 0.4) return `sporadyczny humor (${v}/100)`;
  if (t >= 0.2) return `minimalny humor (${v}/100)`;
  return `prawie bez żartów (${v}/100)`;
}

export function sarcasmGuide(v: number): string {
  const t = trait01(v);
  if (t >= 0.85) return `mocna ironia (${v}/100)`;
  if (t >= 0.65) return `wyraźny sarkazm (${v}/100)`;
  if (t >= 0.4) return `lekka ironia (${v}/100)`;
  if (t >= 0.2) return `minimalna ironia (${v}/100)`;
  return `bez sarkazmu (${v}/100)`;
}

/** Pick variant on a continuous 0..1 scale (0 = first, 1 = last). */
function pickScaled(t: number, items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  const idx = Math.round(Math.max(0, Math.min(1, t)) * (items.length - 1));
  return items[idx]!;
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}
