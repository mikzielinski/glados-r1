import { polishForSpeech } from "../src/spoken-polish.js";

const input =
  "Masz 67 procent. Dziękuję za informację. Możemy wykorzystać ten czas na ciasto.\n\n[Device context: battery=67%]";
const out = polishForSpeech(input);
const ok =
  out.includes("Masz 67 procent") &&
  out.includes("ciasto") &&
  !out.includes("[Device context") &&
  out.split(".").length >= 3;

console.log(`${ok ? "PASS" : "FAIL"}  out="${out}"`);
process.exit(ok ? 0 : 1);
