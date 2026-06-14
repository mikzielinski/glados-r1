export interface DeviceContext {
  batteryPct?: number;
  network?: string;
  location?: { lat: number; lon: number; accuracyM?: number };
  /** Human place name from reverse geocoding (not raw lat/lon). */
  locationLabel?: string;
  /** denied | disabled | no_fix | ok — from R1 client when GPS unavailable */
  locationStatus?: string;
  photoBase64?: string;
  /** TARS sliders from R1 settings (honesty / humor / sarcasm 0–100). */
  tarsTraits?: import("./tars-traits.js").TarsTraits;
}
