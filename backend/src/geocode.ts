import type { AgentSkinId } from "./agent-skins.js";
import { logger } from "./logger.js";
import { locationReply, locationUnknownReply } from "./skin-replies.js";

const log = logger("geocode");

interface GeocodeCacheEntry {
  label: string;
  at: number;
}

const cache = new Map<string, GeocodeCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60_000;

/** Rough sanity check — reject null island and obvious bad fixes. */
export function isPlausibleLocation(lat: number, lon: number, accuracyM?: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (Math.abs(lat) < 0.01 && Math.abs(lon) < 0.01) return false;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return false;
  if (accuracyM != null && accuracyM > 5000) return false;
  return true;
}

/** Human-readable place label for speech. Uses OpenStreetMap Nominatim. */
export async function reverseGeocodeLabel(
  lat: number,
  lon: number,
  lang: "pl" | "en" = "pl",
): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.label;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("format", "json");
    url.searchParams.set("accept-language", lang === "en" ? "en" : "pl");
    url.searchParams.set("zoom", "16");

    const res = await fetch(url, {
      headers: { "user-agent": "glados-r1-backend/0.1 (voice assistant; local dev)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      log.warn(`nominatim HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const label = formatAddressPl(data.address, data.display_name);
    if (label) cache.set(key, { label, at: Date.now() });
    return label;
  } catch (err) {
    log.warn("reverse geocode failed", err);
    return null;
  }
}

function formatAddressPl(address?: Record<string, string>, displayName?: string): string | null {
  if (!address && !displayName) return null;

  const city =
    address?.city ??
    address?.town ??
    address?.village ??
    address?.municipality ??
    address?.county;
  const suburb = address?.suburb ?? address?.neighbourhood ?? address?.quarter;
  const road = address?.road ?? address?.pedestrian ?? address?.footway;
  const house = address?.house_number;

  const parts: string[] = [];
  if (road) parts.push(house ? `${road} ${house}` : road);
  if (suburb && suburb !== city) parts.push(suburb);
  if (city) parts.push(city);

  if (parts.length > 0) return parts.join(", ");

  if (displayName) {
    const short = displayName.split(",").slice(0, 3).map((s) => s.trim()).join(", ");
    return short || null;
  }
  return null;
}

/** Spoken location line — place name, not raw decimal degrees. */
export function formatLocationSpeech(
  lat: number,
  lon: number,
  accuracyM: number | undefined,
  label: string | null | undefined,
  skin: AgentSkinId = "glados",
): string {
  const acc = accuracyM != null && accuracyM > 0 ? Math.round(accuracyM) : null;
  const accText =
    acc != null
      ? acc <= 30
        ? "dokładnie"
        : acc <= 150
          ? `z dokładnością około ${acc} metrów`
          : `bardzo przybliżenie, około ${acc} metrów`
      : "z GPS";

  if (label) {
    return locationReply(skin, label, accText);
  }
  return locationUnknownReply(skin, accText);
}

export function formatLocationFacts(
  lat: number,
  lon: number,
  accuracyM: number | undefined,
  label: string | null | undefined,
): string {
  const acc = accuracyM != null ? Math.round(accuracyM) : 0;
  if (label) return `lokalizacja ${label} (±${acc}m)`;
  return `GPS fix ±${acc}m (adres nierozpoznany)`;
}
