import type { AgentSkinId } from "./agent-skins.js";
import type { ConversationLang } from "./conversation-lang.js";
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
import {
  capabilitiesReplyEn,
  goodbyeReplyEn,
  howAreYouReplyEn,
  jokeReplyEn,
  personalityReplyEn,
  thanksReplyEn,
  weatherReplyEn,
} from "./skin-replies-en.js";
import { normalizeTarsTraits, tarsifyReply, type TarsReplyKind } from "./tars-traits.js";

/** Deterministic replies for common chat — tone follows active skin. */
export function tryChatReply(
  transcript: string,
  ctx: DeviceContext,
  skin: AgentSkinId = "hal9000",
  lang: ConversationLang = "pl",
): string | null {
  const t = transcript.toLowerCase();
  const traits = normalizeTarsTraits(ctx.tarsTraits);
  const en = lang === "en";
  const say = (text: string, kind: TarsReplyKind = "general") =>
    skin === "tars" ? tarsifyReply(text, traits, kind) : text;

  if (matches(t, ["co potrafisz", "co umiesz", "co robisz", "what can you", "what do you do", "pomóż mi", "pomoz mi", "help me"])) {
    return say(en ? capabilitiesReplyEn(skin) : capabilitiesReply(skin), "general");
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
    return say(
      en ? personalityReplyEn(skin, traits) : personalityReply(skin, traits),
      "social",
    );
  }

  if (matches(t, ["pogod", "weather", "deszcz", "słońce", "slonce", "temperatur", "forecast"])) {
    return say(en ? weatherReplyEn(skin) : weatherReply(skin), "general");
  }

  if (matches(t, [" która godzina", "jaka godzina", "what time", "która jest", "ktora jest"])) {
    return en
      ? skin === "hal9000"
        ? "I have no system clock in this session."
        : skin === "tars"
          ? "No clock in session. Check the device."
          : "No system clock here. The Rabbit has one — I have your tests and my patience."
      : skin === "hal9000"
        ? "Nie mam zegara systemowego w tej sesji."
        : skin === "tars"
          ? "Brak zegara w sesji. Sprawdź urządzenie."
          : "Nie mam zegara systemowego w tej sesji. Rabbit R1 ma swój — ja mam tylko twoje testy i moją cierpliwość.";
  }

  if (matches(t, ["dziękuj", "dziekuje", "thank"])) {
    return say(en ? thanksReplyEn(skin) : thanksReply(skin), "social");
  }

  if (matches(t, ["do widzenia", "bye", "goodbye", "see you"]) || matchesWord(t, ["pa", "koniec"])) {
    return say(en ? goodbyeReplyEn(skin) : goodbyeReply(skin), "social");
  }

  if (matches(t, ["żart", "zart", "joke", "śmiesz", "smiesz", "ciasto", "funny"])) {
    return say(en ? jokeReplyEn(skin, traits) : jokeReply(skin, traits), "joke");
  }

  if (matches(t, ["nudz", "bored", "zabaw", "entertain"])) {
    const extra =
      ctx.batteryPct != null
        ? en
          ? ` You have ${ctx.batteryPct} percent battery.`
          : skin === "hal9000"
            ? ` Masz ${ctx.batteryPct} procent baterii.`
            : skin === "tars"
              ? ` Bateria: ${ctx.batteryPct} procent.`
              : ` Masz ${ctx.batteryPct} procent baterii — wystarczy na kolejny bezsensowny eksperyment.`
        : "";
    return say(
      en
        ? skin === "hal9000"
          ? `Bored? I can talk about anything — or check device status.${extra}`
          : skin === "tars"
            ? `Bored. Ask about anything — code optional.${extra}`
            : `Boredom means ask a better question. I can discuss anything.${extra}`
        : skin === "hal9000"
          ? `Nuda? Mogę opowiedzieć o czymkolwiek — albo sprawdzić stan urządzenia.${extra}`
          : skin === "tars"
            ? `Nuda. Zapytaj o cokolwiek — nie musi być kod.${extra}`
            : `Nuda to sygnał, żeby zadać ciekawsze pytanie. Mogę porozmawiać o czymkolwiek.${extra}`,
      "social",
    );
  }

  if (matches(t, ["jak się masz", "jak sie masz", "how are you", "how're you"])) {
    return say(en ? howAreYouReplyEn(skin) : howAreYouReply(skin), "social");
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
