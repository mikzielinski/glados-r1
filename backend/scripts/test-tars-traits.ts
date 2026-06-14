import { normalizeTarsTraits, tarsifyReply } from "../src/tars-traits.js";

let failures = 0;

function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

const blunt = normalizeTarsTraits({ honesty: 95, humor: 30, sarcasm: 30 });
const funny = normalizeTarsTraits({ honesty: 70, humor: 90, sarcasm: 40 });
const sarcastic = normalizeTarsTraits({ honesty: 80, humor: 50, sarcasm: 75 });

check("high honesty prefix", tarsifyReply("Pięć procent.", blunt, "factual").startsWith("Bez owijania"));
check("high humor tail", tarsifyReply("OK.", funny, "social").includes("Humor"));
check("high sarcasm", tarsifyReply("GPS działa.", sarcastic, "factual").includes("Genialny"));

process.exit(failures === 0 ? 0 : 1);
