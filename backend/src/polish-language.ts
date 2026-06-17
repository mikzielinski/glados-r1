/**
 * Polish language quality for SLM/cloud output — diacritics, calques, natural phrasing.
 * Applied before TTS (spoken-polish.ts) and after every local SLM reply.
 */

const DIACRITIC_WORDS: Record<string, string> = {
  prosze: "proszę",
  dziekuje: "dziękuję",
  dzieki: "dzięki",
  latwo: "łatwo",
  cos: "coś",
  zle: "źle",
  ze: "że",
  pamiec: "pamięć",
  pamietam: "pamiętam",
  pamietasz: "pamiętasz",
  zapamietaj: "zapamiętaj",
  wyczysc: "wyczyść",
  cala: "całą",
  caly: "cały",
  calosc: "całość",
  urzadzenie: "urządzenie",
  urzadzeniu: "urządzeniu",
  urzadzenia: "urządzenia",
  tez: "też",
  juz: "już",
  moze: "może",
  mozemy: "możemy",
  mozesz: "możesz",
  moge: "mogę",
  bedzie: "będzie",
  bede: "będę",
  jestes: "jesteś",
  jestescie: "jesteście",
  sie: "się",
  wiecej: "więcej",
  mowie: "mówię",
  mowisz: "mówisz",
  mowi: "mówi",
  powiedz: "powiedz",
  powiedzialem: "powiedziałem",
  powiedzialam: "powiedziałam",
  powiedziales: "powiedziałeś",
  wykorzystac: "wykorzystać",
  informacje: "informacje",
  informacji: "informacji",
  dziala: "działa",
  dzialaja: "działają",
  dzialanie: "działanie",
  gotowy: "gotowy",
  gotowa: "gotowa",
  gotowe: "gotowe",
  wystarczy: "wystarczy",
  szybko: "szybko",
  wolno: "wolno",
  bled: "błąd",
  bledy: "błędy",
  blad: "błąd",
  blędy: "błędy",
  rozwiazanie: "rozwiązanie",
  rozwiazac: "rozwiązać",
  rozwiaze: "rozwiąże",
  uzytkownik: "użytkownik",
  uzytkownika: "użytkownika",
  uzywac: "używać",
  uzywasz: "używasz",
  wiadomosc: "wiadomość",
  wiadomosci: "wiadomości",
  pytanie: "pytanie",
  pytania: "pytania",
  odpowiedz: "odpowiedź",
  odpowiedzi: "odpowiedzi",
  swiat: "świat",
  swiecie: "świecie",
  dzis: "dziś",
  dzisiaj: "dzisiaj",
  jutro: "jutro",
  wczoraj: "wczoraj",
  cie: "cię",
  go: "go",
  jej: "jej",
  swoj: "swój",
  swoja: "swoja",
  swoje: "swoje",
  swoim: "swój",
  przez: "przez",
  prawdopodobnie: "prawdopodobnie",
  oczywiscie: "oczywiście",
  napewno: "na pewno",
  naprawde: "naprawdę",
  zupelnie: "zupełnie",
  szczegolnie: "szczególnie",
  wlasnie: "właśnie",
  dlatego: "dlatego",
  poniewaz: "ponieważ",
  rowniez: "również",
  jednak: "jednak",
  chociaz: "chociaż",
  chociaż: "chociaż",
  wogole: "w ogóle",
  wogle: "w ogóle",
  nigdy: "nigdy",
  zawsze: "zawsze",
  czasem: "czasem",
  czasami: "czasami",
  wiedziec: "wiedzieć",
  wiedze: "wiedzę",
  rozumiec: "rozumieć",
  rozumiem: "rozumiem",
  pomoc: "pomoc",
  pomoge: "pomogę",
  pomocy: "pomocy",
  przepraszam: "przepraszam",
  witaj: "witaj",
  witam: "witam",
  dzien: "dzień",
  dobry: "dobry",
  dobrego: "dobrego",
  wieczor: "wieczór",
  rano: "rano",
  polsku: "polsku",
  polskim: "polskim",
  polska: "polska",
  polski: "polski",
  polskie: "polskie",
  programowanie: "programowanie",
  komputer: "komputer",
  komputera: "komputera",
  internet: "internet",
  internecie: "internecie",
  bateria: "bateria",
  baterii: "baterii",
  lokalizacja: "lokalizacja",
  lokalizacji: "lokalizacji",
  zrodlo: "źródło",
  zrodla: "źródła",
  rozmowa: "rozmowa",
  rozmawiac: "rozmawiać",
  rozmawiam: "rozmawiam",
  senpai: "senpai",
  kohai: "kohai",
};

/** Dosłowne kalki i anglicyzmy — typowe u małych wielojęzycznych SLM. */
const PHRASE_FIXES: Array<[RegExp, string]> = [
  [/\bJestem\s+w\s+stanie\b/gi, "Potrafię"],
  [/\bNie\s+jestem\s+w\s+stanie\b/gi, "Nie mogę"],
  [/\bTo\s+jest\s+jest\b/gi, "To jest"],
  [/\bJa\s+myślę\s+że\b/gi, "Myślę, że"],
  [/\bW\s+moim\s+mniemaniu\b/gi, "Moim zdaniem"],
  [/\bNa\s+ten\s+moment\b/gi, "Na razie"],
  [/\bW\s+tym\s+czasie\b/gi, "Tymczasem"],
  [/\bimportant\b/gi, "ważne"],
  [/\bwith this problem\b/gi, "z tym"],
  [/\bPotrafię pomoc\b/g, "Potrafię pomóc"],
  [/\bvery\b/gi, "bardzo"],
  [/\bOK\b/g, "okej"],
  [/\bsorry\b/gi, "przepraszam"],
  [/\bplease\b/gi, "proszę"],
  [/\bthank\s+you\b/gi, "dziękuję"],
  [/\bthanks\b/gi, "dzięki"],
  [/\bhello\b/gi, "cześć"],
  [/\bhi\b/gi, "cześć"],
  [/\bhappy\b/gi, "zadowolony"],
  [/\bproblem\b/gi, "problem"],
  [/\bI\s+think\b/gi, "Myślę"],
  [/\bI\s+am\b/gi, "Jestem"],
  [/\bYou\s+are\b/gi, "Jesteś"],
  [/\bIt\s+is\b/gi, "To jest"],
  [/\b(\w{4,})\s+\1\b/gi, "$1"],
  [/\s{2,}/g, " "],
];

const ONES = [
  "zero", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć",
  "dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście",
  "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście",
];

const TENS = [
  "", "", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt",
  "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt",
];

const HUNDREDS = [
  "", "sto", "dwieście", "trzysta", "czterysta", "pięćset",
  "sześćset", "siedemset", "osiemset", "dziewięćset",
];

/** Injected into every local SLM system prompt. */
export function slmPolishInstructions(skin?: string): string {
  const gender =
    skin === "onee" || skin === "tsun" || skin === "kohai"
      ? "\n- Forma gramatyczna: pierwsza osoba RODZAJU żeńskiego («powiedziałam», «zrobiłam», «widzę», «pomogę» — nie męska)."
      : skin === "komandor" || skin === "egz" || skin === "wiesiek" || skin === "hal9000" || skin === "tars"
        ? "\n- Forma gramatyczna: pierwsza osoba RODZAJU męskiego («powiedziałem», «zrobiłem», «widzę»)."
        : "";

  return `JĘZYK POLSKI (krytyczne — jakość native speakera):
- Pisz WYŁĄCZNIE poprawnym, naturalnym polskim — jak rozmowa na co dzień, NIE jak tłumaczenie maszynowe.
- Zawsze używaj znaków: ą, ć, ę, ł, ń, ó, ś, ź, ż. NIGDY «prosze», «dziekuje», «cos», «sie», «juz», «moze» bez ogonków.
- Unikaj kalk angielskich/rosyjskich. ZŁE: «Jestem happy», «To jest very important», «W moim mniemaniu». DOBRE: «Cieszę się», «To bardzo ważne», «Moim zdaniem».
- Nie wstawiaj angielskich słów w polskiej wypowiedzi (wyjątek: nazwy własne, kod, GLaDOS, TARS, senpai).
- Naturalny szyk polski — podmiot, orzeczenie, dopełnienie. Krótkie, pełne zdania.
- Liczby w warstwie mowy podawaj słownie: «sześćdziesiąt siedem procent», nie «67%» ani «67 procent».
- Poprawna odmiana: «pomogę ci», «powiedziałam ci», «nie wiem tego» — unikaj sztywnego «robotycznego» brzmienia.${gender}

Przykład DOBREGO polskiego (styl, nie kopiuj treści):
«Masz sześćdziesiąt siedem procent baterii. Wystarczy na spokojną rozmowę — pytaj śmiało.»

Przykład ZŁEGO (tak NIE pisz):
«Ty have 67% battery. To jest very good. Ja pomogę ci with this problem.»`;
}

/** Normalize SLM/cloud Polish before display and TTS. */
export function polishLanguageQuality(raw: string): string {
  let text = raw
    .replace(/\[Device context:[^\]]*]/gi, "")
    .replace(/\[speaking in[^\]]*]/gi, "")
    .trim();

  for (const [re, repl] of PHRASE_FIXES) {
    text = text.replace(re, repl);
  }
  text = restoreDiacritics(text);
  return text.trim();
}

export function digitsToPolishWords(text: string): string {
  return text.replace(/\b(\d{1,3})(?:\s*(%|proc\.?|procent(?:ów|u|ach|ami)?))?\b/gi, (full, numStr, unit) => {
    const n = parseInt(numStr, 10);
    if (Number.isNaN(n)) return full;
    const word = polishNumberWord(n);
    if (unit && /%|proc|procent/i.test(unit)) return `${word} procent`;
    return word;
  });
}

function restoreDiacritics(text: string): string {
  return text.replace(/\b([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)\b/g, (word) => {
    const key = word.toLowerCase();
    const fixed = DIACRITIC_WORDS[key];
    if (!fixed) return word;
    if (word[0] === word[0]?.toUpperCase()) {
      return fixed.charAt(0).toUpperCase() + fixed.slice(1);
    }
    return fixed;
  });
}

function polishNumberWord(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n > 999) return String(n);
  if (n < 20) return ONES[n]!;
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? TENS[t]! : `${TENS[t]} ${ONES[o]}`;
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (rest === 0) return HUNDREDS[h]!;
  return `${HUNDREDS[h]} ${polishNumberWord(rest)}`;
}
