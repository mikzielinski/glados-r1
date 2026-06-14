import type { AgentSkinId } from "./agent-skins.js";
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
import { normalizeTarsTraits, tarsifyReply, type TarsReplyKind, type TarsTraits } from "./tars-traits.js";

/**
 * Instant replies for Rabbit R1 device queries — no LLM round-trip.
 * Tone follows active agent skin (HAL / GLaDOS / TARS).
 */
export function tryDeviceReply(
  transcript: string,
  ctx: DeviceContext,
  skin: AgentSkinId = "hal9000",
): string | null {
  const t = transcript.toLowerCase();
  const traits = normalizeTarsTraits(ctx.tarsTraits);
  const say = (text: string, kind: TarsReplyKind = "factual") =>
    skin === "tars" ? tarsifyReply(text, traits, kind) : text;

  if (matches(t, ["battery", "bateria", "baterii", "charge", "power", "naładow", "naladow", "procent"])) {
    if (ctx.batteryPct != null) return say(batteryReply(skin, ctx.batteryPct), "factual");
    return say(batteryUnknownReply(skin), "factual");
  }

  if (matches(t, ["gps", "location", "where am i", "gdzie jestem", "pozycja", "lokalizac", "coordinates", "adres"])) {
    if (ctx.location && isPlausibleLocation(ctx.location.lat, ctx.location.lon, ctx.location.accuracyM)) {
      const acc = accuracyText(ctx.location.accuracyM);
      const place = ctx.locationLabel ?? "nieznany punkt";
      return say(locationReply(skin, place, acc), "factual");
    }
    if (ctx.location && !isPlausibleLocation(ctx.location.lat, ctx.location.lon, ctx.location.accuracyM)) {
      return skin === "tars"
        ? "GPS wygląda na śmieciowy. Wyjdź na zewnątrz i spróbuj ponownie."
        : skin === "hal9000"
          ? "Fix GPS wygląda na niewiarygodny. Wyjdź na zewnątrz i odczekaj chwilę."
          : "Fix GPS wygląda na śmieciowy albo zbyt niedokładny. Wyjdź na zewnątrz, odczekaj chwilę i zapytaj jeszcze raz.";
    }
    if (ctx.locationStatus === "denied") {
      return skin === "tars"
        ? "Brak uprawnień do lokalizacji. Włącz je w ustawieniach aplikacji."
        : skin === "hal9000"
          ? "Aplikacja nie ma uprawnień do lokalizacji. Włącz je w ustawieniach."
          : "Aplikacja nie ma uprawnień do lokalizacji. Włącz je w ustawieniach — bez tego nawet ja nie widzę, gdzie stoisz.";
    }
    if (ctx.locationStatus === "disabled") {
      return "Lokalizacja jest wyłączona w systemie. Włącz GPS w ustawieniach Androida, a potem spróbuj ponownie.";
    }
    return skin === "tars"
      ? "Brak fixa GPS. Wyjdź na zewnątrz i poczekaj pół minuty."
      : skin === "hal9000"
        ? "Brak fixa GPS. Satelity milczą. Wyjdź na zewnątrz."
        : "Brak fixa GPS — satelity milczą. Wyjdź na zewnątrz, odczekaj pół minuty i zapytaj jeszcze raz. W pomieszczeniu Rabbit często nie łapie sygnału.";
  }

  if (matches(t, ["wifi", "network", "internet", "sieć", "siec", "online", "offline", "connection"])) {
    if (ctx.network) {
      const label = networkLabelPl(ctx.network);
      if (skin === "hal9000") {
        return `Sieć: ${label}. Połączenie ${ctx.network === "offline" ? "nieaktywne" : "aktywne"}.`;
      }
      if (skin === "tars") {
        return `Sieć ${label}. ${ctx.network === "offline" ? "Offline." : "Online."}`;
      }
      const alive = ctx.network === "offline" ? "martwe" : "żywe";
      return `Sieć: ${label}. Połączenie wygląda na ${alive} — ${ctx.network === "offline" ? "idealne warunki do testu offline" : "możesz dalej psuć kod z pełnym entuzjazmem"}.`;
    }
    return skin === "hal9000"
      ? "Nie znam stanu sieci."
      : skin === "tars"
        ? "Brak danych o sieci."
        : "Nie znam stanu sieci. Magia Rabbit R1 mnie zawiodła — rzadki, ale fascynujący błąd.";
  }

  if (matches(t, ["status", "stan", "report", "raport", "device", "urządzen", "urzadzen", "rabbit"])) {
    const parts: string[] = [];
    if (ctx.batteryPct != null) parts.push(`bateria ${ctx.batteryPct}%`);
    if (ctx.network) parts.push(`sieć ${networkLabelPl(ctx.network)}`);
    if (ctx.location && isPlausibleLocation(ctx.location.lat, ctx.location.lon, ctx.location.accuracyM)) {
      parts.push(ctx.locationLabel ? `GPS ${ctx.locationLabel}` : "GPS aktywny");
    }
    return say(statusReportReply(skin, parts.join(", ")), "factual");
  }

  if (matches(t, ["cześć", "czesc", "hej", "hello", "hi", "witaj", "dzień dobry", "dzien dobry"])) {
    return say(greetingReply(skin), "social");
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
    return say(personalityReply(skin), "social");
  }

  if (matches(t, ["kim jesteś", "kim jestes", "kto to ty", "who are you", "co to glados", "glados", "hal", "tars"])) {
    return say(whoAmIReply(skin), "social");
  }

  return null;
}

export function isLocationQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return matches(t, ["gps", "location", "where am i", "gdzie jestem", "pozycja", "lokalizac", "coordinates", "adres"]);
}

function accuracyText(accuracyM: number | undefined): string {
  const acc = accuracyM != null && accuracyM > 0 ? Math.round(accuracyM) : null;
  if (acc == null) return "z GPS";
  if (acc <= 30) return "dokładnie";
  if (acc <= 150) return `z dokładnością około ${acc} metrów`;
  return `bardzo przybliżenie, około ${acc} metrów`;
}

function networkLabelPl(network: string): string {
  return ({ wifi: "WiFi", lte: "LTE", offline: "offline", online: "online", unknown: "nieznana" } as Record<string, string>)[network] ?? network;
}

function matches(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}
