import { polishLanguageQuality, slmPolishInstructions } from "../src/polish-language.js";
import { polishForSpeech } from "../src/spoken-polish.js";

let ok = true;

const bad = "Prosze, to jest very important. Ja pomoge ci with this problem. Masz 67 procent baterii.";
const fixed = polishForSpeech(bad);
const lower = fixed.toLowerCase();
if (!lower.includes("proszę") || !lower.includes("sześćdziesiąt siedem procent") || !lower.includes("ważne")) {
  ok = false;
  console.log("FAIL diacritics/numbers:", fixed);
} else {
  console.log("PASS polishForSpeech:", fixed);
}

const calque = polishLanguageQuality("W moim mniemaniu to jest jest OK. Jestem w stanie pomoc.");
if (calque.includes("mniemaniu") || calque.includes("jest jest")) {
  ok = false;
  console.log("FAIL calques:", calque);
} else {
  console.log("PASS calques:", calque);
}

if (!slmPolishInstructions("onee").includes("żeńskiego")) {
  ok = false;
  console.log("FAIL gender hint");
} else {
  console.log("PASS slmPolishInstructions onee");
}

process.exit(ok ? 0 : 1);
