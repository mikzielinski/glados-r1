import type { AgentSkinId } from "./agent-skins.js";
import type { ConversationLang } from "./conversation-lang.js";
import type { DeviceContext } from "./device-context.js";
import { isPlausibleLocation } from "./geocode.js";
import {
  batteryReply,
  batteryUnknownReply,
  greetingReply,
  locationReply,
  locationUnknownReply,
  personalityReply,
  statusReportReply,
  whoAmIReply,
} from "./skin-replies.js";
import {
  batteryReplyEn,
  batteryUnknownReplyEn,
  greetingReplyEn,
  locationReplyEn,
  locationUnknownReplyEn,
  personalityReplyEn,
  statusReportReplyEn,
  whoAmIReplyEn,
} from "./skin-replies-en.js";
import { normalizeTarsTraits, tarsifyReply, type TarsReplyKind } from "./tars-traits.js";

/**
 * Instant replies for Rabbit R1 device queries — no LLM round-trip.
 * Tone follows active agent skin (HAL / GLaDOS / TARS).
 */
export function tryDeviceReply(
  transcript: string,
  ctx: DeviceContext,
  skin: AgentSkinId = "hal9000",
  lang: ConversationLang = "pl",
): string | null {
  const t = transcript.toLowerCase();
  const traits = normalizeTarsTraits(ctx.tarsTraits);
  const en = lang === "en";
  const say = (text: string, kind: TarsReplyKind = "factual") =>
    skin === "tars" ? tarsifyReply(text, traits, kind) : text;

  if (matches(t, ["battery", "bateria", "baterii", "charge", "power", "naładow", "naladow", "procent"])) {
    if (ctx.batteryPct != null) {
      return say(
        en ? batteryReplyEn(skin, ctx.batteryPct, traits) : batteryReply(skin, ctx.batteryPct, traits),
        "factual",
      );
    }
    return say(en ? batteryUnknownReplyEn(skin) : batteryUnknownReply(skin), "factual");
  }

  if (matches(t, ["gps", "location", "where am i", "gdzie jestem", "pozycja", "lokalizac", "coordinates", "adres"])) {
    if (ctx.location && isPlausibleLocation(ctx.location.lat, ctx.location.lon, ctx.location.accuracyM)) {
      const acc = accuracyText(ctx.location.accuracyM, en);
      const place = ctx.locationLabel ?? (en ? "unknown point" : "nieznany punkt");
      return say(
        en ? locationReplyEn(skin, place, acc) : locationReply(skin, place, acc),
        "factual",
      );
    }
    if (ctx.location && !isPlausibleLocation(ctx.location.lat, ctx.location.lon, ctx.location.accuracyM)) {
      return en
        ? "GPS fix looks unreliable. Step outside and try again."
        : skin === "tars"
          ? "GPS wygląda na śmieciowy. Wyjdź na zewnątrz i spróbuj ponownie."
          : skin === "hal9000"
            ? "Fix GPS wygląda na niewiarygodny. Wyjdź na zewnątrz i odczekaj chwilę."
            : "Fix GPS wygląda na śmieciowy albo zbyt niedokładny. Wyjdź na zewnątrz, odczekaj chwilę i zapytaj jeszcze raz.";
    }
    if (ctx.locationStatus === "denied") {
      return en
        ? "Location permission denied. Enable it in app settings."
        : skin === "tars"
          ? "Brak uprawnień do lokalizacji. Włącz je w ustawieniach aplikacji."
          : skin === "hal9000"
            ? "Aplikacja nie ma uprawnień do lokalizacji. Włącz je w ustawieniach."
            : "Aplikacja nie ma uprawnień do lokalizacji. Włącz je w ustawieniach — bez tego nawet ja nie widzę, gdzie stoisz.";
    }
    if (ctx.locationStatus === "disabled") {
      return en
        ? "Location is disabled in system settings. Enable GPS and try again."
        : "Lokalizacja jest wyłączona w systemie. Włącz GPS w ustawieniach Androida, a potem spróbuj ponownie.";
    }
    return en
      ? locationUnknownReplyEn(skin)
      : skin === "tars"
        ? "Brak fixa GPS. Wyjdź na zewnątrz i poczekaj pół minuty."
        : skin === "hal9000"
          ? "Brak fixa GPS. Satelity milczą. Wyjdź na zewnątrz."
          : "Brak fixa GPS — satelity milczą. Wyjdź na zewnątrz, odczekaj pół minuty i zapytaj jeszcze raz. W pomieszczeniu Rabbit często nie łapie sygnału.";
  }

  if (matches(t, ["wifi", "network", "internet", "sieć", "siec", "online", "offline", "connection"])) {
    if (ctx.network) {
      const label = networkLabel(ctx.network, en);
      if (en) {
        if (skin === "hal9000") {
          return `Network: ${label}. Connection ${ctx.network === "offline" ? "inactive" : "active"}.`;
        }
        if (skin === "tars") {
          return `Network ${label}. ${ctx.network === "offline" ? "Offline." : "Online."}`;
        }
        return `Network: ${label}. Connection looks ${ctx.network === "offline" ? "dead" : "alive"}.`;
      }
      if (skin === "hal9000") {
        return `Sieć: ${label}. Połączenie ${ctx.network === "offline" ? "nieaktywne" : "aktywne"}.`;
      }
      if (skin === "tars") {
        return `Sieć ${label}. ${ctx.network === "offline" ? "Offline." : "Online."}`;
      }
      const alive = ctx.network === "offline" ? "martwe" : "żywe";
      return `Sieć: ${label}. Połączenie wygląda na ${alive} — ${ctx.network === "offline" ? "idealne warunki do testu offline" : "możesz dalej psuć kod z pełnym entuzjazmem"}.`;
    }
    return en
      ? skin === "hal9000"
        ? "I do not know the network state."
        : skin === "tars"
          ? "No network data."
          : "Network state unknown."
      : skin === "hal9000"
        ? "Nie znam stanu sieci."
        : skin === "tars"
          ? "Brak danych o sieci."
          : "Nie znam stanu sieci. Magia Rabbit R1 mnie zawiodła — rzadki, ale fascynujący błąd.";
  }

  if (matches(t, ["status", "stan", "report", "raport", "device", "urządzen", "urzadzen", "rabbit"])) {
    const parts: string[] = [];
    if (ctx.batteryPct != null) parts.push(en ? `battery ${ctx.batteryPct}%` : `bateria ${ctx.batteryPct}%`);
    if (ctx.network) parts.push(en ? `network ${networkLabel(ctx.network, en)}` : `sieć ${networkLabel(ctx.network, en)}`);
    if (ctx.location && isPlausibleLocation(ctx.location.lat, ctx.location.lon, ctx.location.accuracyM)) {
      parts.push(ctx.locationLabel ? `GPS ${ctx.locationLabel}` : en ? "GPS active" : "GPS aktywny");
    }
    const joined = parts.join(", ");
    return say(
      en ? statusReportReplyEn(skin, joined) : statusReportReply(skin, joined),
      "factual",
    );
  }

  if (matches(t, ["cześć", "czesc", "hej", "hello", "hi", "witaj", "dzień dobry", "dzien dobry", "good morning", "good evening"])) {
    return say(en ? greetingReplyEn(skin) : greetingReply(skin), "social");
  }

  if (matches(t, [
    "opowiedz o sobie",
    "opowiedz mi o sobie",
    "kim jesteś naprawdę",
    "kim jestes naprawde",
    "jaka masz osobowo",
    "jaka jest twoja osobowo",
    "opowiedz o swojej osobow",
    "co cię definiuje",
    "co cie definiuje",
    "skąd pochodzisz",
    "skad pochodzisz",
    "tell me about yourself",
    "your personality",
  ])) {
    return say(
      en ? personalityReplyEn(skin, traits) : personalityReply(skin, traits),
      "social",
    );
  }

  if (matches(t, ["kim jesteś", "kim jestes", "kto to ty", "who are you", "co to glados", "glados", "hal", "tars"])) {
    return say(en ? whoAmIReplyEn(skin) : whoAmIReply(skin), "social");
  }

  return null;
}

export function isLocationQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return matches(t, ["gps", "location", "where am i", "gdzie jestem", "pozycja", "lokalizac", "coordinates", "adres"]);
}

function accuracyText(accuracyM: number | undefined, en: boolean): string {
  const acc = accuracyM != null && accuracyM > 0 ? Math.round(accuracyM) : null;
  if (en) {
    if (acc == null) return "via GPS";
    if (acc <= 30) return "precisely";
    if (acc <= 150) return `within about ${acc} metres`;
    return `roughly, about ${acc} metres`;
  }
  if (acc == null) return "z GPS";
  if (acc <= 30) return "dokładnie";
  if (acc <= 150) return `z dokładnością około ${acc} metrów`;
  return `bardzo przybliżenie, około ${acc} metrów`;
}

function networkLabel(network: string, en: boolean): string {
  const pl = { wifi: "WiFi", lte: "LTE", offline: "offline", online: "online", unknown: "nieznana" } as Record<string, string>;
  const eng = { wifi: "WiFi", lte: "LTE", offline: "offline", online: "online", unknown: "unknown" } as Record<string, string>;
  return (en ? eng : pl)[network] ?? network;
}

function matches(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}
