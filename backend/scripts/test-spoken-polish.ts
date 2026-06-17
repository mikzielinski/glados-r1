import { polishForSpeech } from "../src/spoken-polish.js";

const input =
  "Masz 67 procent. Dziekuje za informacje. Mozemy wykorzystac ten czas na ciasto.\n\n[Device context: battery=67%]";
const out = polishForSpeech(input);
const lower = out.toLowerCase();
const ok =
  out.includes("sześćdziesiąt siedem procent") &&
  lower.includes("dziękuję") &&
  lower.includes("możemy") &&
  lower.includes("ciasto") &&
  !out.includes("[Device context") &&
  out.split(".").filter((s) => s.trim()).length >= 3;

console.log(`${ok ? "PASS" : "FAIL"}  out="${out}"`);
process.exit(ok ? 0 : 1);
