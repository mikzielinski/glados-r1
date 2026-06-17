import {
  normalizeTarsTraits,
  shapeTarsSpeech,
  tarsBatteryReply,
  tarsFewShots,
  tarsifyReply,
} from "../src/tars-traits.js";

let failures = 0;

function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

const blunt = normalizeTarsTraits({ honesty: 95, humor: 30, sarcasm: 30 });
const funny = normalizeTarsTraits({ honesty: 70, humor: 90, sarcasm: 40 });
const sarcastic = normalizeTarsTraits({ honesty: 80, humor: 50, sarcasm: 75 });
const soft = normalizeTarsTraits({ honesty: 35, humor: 20, sarcasm: 15 });

check("high honesty prefix", tarsifyReply("Pięć procent.", blunt, "factual").startsWith("Bez owijania"));
check("high humor tail", tarsifyReply("OK.", funny, "social").toLowerCase().includes("humor"));
check("high sarcasm", tarsifyReply("GPS działa.", sarcastic, "factual") !== tarsifyReply("GPS działa.", { ...sarcastic, sarcasm: 10 }, "factual"));
check("blunt battery", tarsBatteryReply(67, blunt).includes("Tyle"));
check("sarcastic battery", tarsBatteryReply(67, sarcastic) !== tarsBatteryReply(67, { ...sarcastic, sarcasm: 10 }));
check("few-shots reflect sliders", tarsFewShots(blunt).includes("Tyle"));
check("llm hedging stripped", shapeTarsSpeech("Może masz rację.", { ...blunt, honesty: 88 }, "llm").includes("Masz rację"));
check("soft tone", /^Być może|^Możliwe|^Chyba/i.test(shapeTarsSpeech("Masz rację.", soft, "llm")));

const low = normalizeTarsTraits({ honesty: 25, humor: 15, sarcasm: 10 });
const mid = normalizeTarsTraits({ honesty: 50, humor: 50, sarcasm: 50 });
const high = normalizeTarsTraits({ honesty: 95, humor: 95, sarcasm: 95 });

check("battery low ≠ high", tarsBatteryReply(67, low) !== tarsBatteryReply(67, high));
check("battery mid ≠ high", tarsBatteryReply(67, mid) !== tarsBatteryReply(67, high));
check("humor 25 ≠ 55", tarsifyReply("OK.", { ...blunt, humor: 25 }, "social") !== tarsifyReply("OK.", { ...blunt, humor: 55 }, "social"));
check("humor 55 ≠ 85", tarsifyReply("OK.", { ...blunt, humor: 55 }, "social") !== tarsifyReply("OK.", { ...blunt, humor: 85 }, "social"));
check("sarcasm 20 ≠ 60", tarsifyReply("GPS.", { ...blunt, sarcasm: 20 }, "factual") !== tarsifyReply("GPS.", { ...blunt, sarcasm: 60 }, "factual"));

process.exit(failures === 0 ? 0 : 1);
