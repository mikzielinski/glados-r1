import type { AgentSkinId } from "./agent-skins.js";
import type { DeviceContext } from "./device-context.js";
import {
  capabilitiesReply,
  goodbyeReply,
  howAreYouReply,
  jokeReply,
  personalityReply,
  thanksReply,
  weatherReply,
} from "./skin-replies.js";
import { normalizeTarsTraits, tarsifyReply, type TarsReplyKind, type TarsTraits } from "./tars-traits.js";

/** Deterministic replies for common chat — tone follows active skin. */
export function tryChatReply(
  transcript: string,
  ctx: DeviceContext,
  skin: AgentSkinId = "hal9000",
): string | null {
  const t = transcript.toLowerCase();
  const traits = normalizeTarsTraits(ctx.tarsTraits);
  const say = (text: string, kind: TarsReplyKind = "general") =>
    skin === "tars" ? tarsifyReply(text, traits, kind) : text;

  if (matches(t, ["co potrafisz", "co umiesz", "co robisz", "what can you", "pomóż mi", "pomoz mi"])) {
    return say(capabilitiesReply(skin), "general");
  }

  if (matches(t, [
    "opowiedz o sobie",
    "opowiedz mi o sobie",
    "jaka masz osobowo",
    "jaka jest twoja osobowo",
    "opowiedz o swojej osobow",
    "co cię definiuje",
    "co cie definiuje",
    "tell me about yourself",
    "your personality",
  ])) {
    return say(personalityReply(skin), "social");
  }

  if (matches(t, ["pogod", "weather", "deszcz", "słońce", "slonce", "temperatur"])) {
    return say(weatherReply(skin), "general");
  }

  if (matches(t, [" która godzina", "jaka godzina", "what time", "która jest", "ktora jest"])) {
    return skin === "hal9000"
      ? "Nie mam zegara systemowego w tej sesji."
      : skin === "tars"
        ? "Brak zegara w sesji. Sprawdź urządzenie."
        : "Nie mam zegara systemowego w tej sesji. Rabbit R1 ma swój — ja mam tylko twoje testy i moją cierpliwość.";
  }

  if (matches(t, ["dziękuj", "dziekuje", "thank"])) {
    return say(thanksReply(skin), "social");
  }

  if (matches(t, ["do widzenia", "bye", "goodbye"]) || matchesWord(t, ["pa", "koniec"])) {
    return say(goodbyeReply(skin), "social");
  }

  if (matches(t, ["żart", "zart", "joke", "śmiesz", "smiesz", "ciasto"])) {
    return say(jokeReply(skin), "joke");
  }

  if (matches(t, ["nudz", "bored", "zabaw"])) {
    const extra =
      ctx.batteryPct != null
        ? skin === "hal9000"
          ? ` Masz ${ctx.batteryPct} procent baterii.`
          : skin === "tars"
            ? ` Bateria: ${ctx.batteryPct} procent.`
            : ` Masz ${ctx.batteryPct} procent baterii — wystarczy na kolejny bezsensowny eksperyment.`
        : "";
    return say(
      skin === "hal9000"
        ? `Nuda? Mogę zaproponować audyt twojego kodu.${extra}`
        : skin === "tars"
          ? `Nuda. Znajdź coś do naprawy.${extra}`
          : `Nuda to sygnał, że powinieneś coś zepsuć i naprawić. Idealny test laboratoryjny.${extra}`,
      "social",
    );
  }

  if (matches(t, ["jak się masz", "jak sie masz", "how are you"])) {
    return say(howAreYouReply(skin), "social");
  }

  return null;
}

function matches(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function matchesWord(text: string, words: string[]): boolean {
  return words.some((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, "iu").test(text));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
