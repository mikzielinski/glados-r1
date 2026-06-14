import { tryDeviceReply } from "../src/device-router.js";
import type { DeviceContext } from "../src/device-context.js";

const ctx: DeviceContext = { batteryPct: 42, network: "wifi" };
const cases: Array<[string, boolean]> = [
  ["jaka bateria", true],
  ["battery status", true],
  ["hello there", true],
  ["napraw bug", false],
];

let failures = 0;
for (const [text, expectHit] of cases) {
  const hit = tryDeviceReply(text, ctx) != null;
  const ok = hit === expectHit;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  "${text}" hit=${hit}`);
}
process.exit(failures === 0 ? 0 : 1);
