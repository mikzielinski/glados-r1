import {
  applyTarsTraitChange,
  parseTarsTraitCommand,
  tarsTraitChangeReply,
} from "../src/tars-traits-router.js";
import { normalizeTarsTraits } from "../src/tars-traits.js";

let failures = 0;

function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

const p1 = parseTarsTraitCommand("Tars ustaw poziom żartu na 60%");
check("parse humor set 60", p1?.trait === "humor" && p1.mode === "set" && p1.value === 60);

const p2 = parseTarsTraitCommand("ustaw szczerość na 90 procent");
check("parse honesty 90", p2?.trait === "honesty" && p2.value === 90);

const p3 = parseTarsTraitCommand("Tars zwiększ sarkazm o 15");
check("parse sarcasm delta +15", p3?.trait === "sarcasm" && p3.mode === "delta" && p3.value === 15);

check("ignore unrelated", parseTarsTraitCommand("jaka pogoda") === null);

const base = normalizeTarsTraits({ honesty: 90, humor: 75, sarcasm: 35 });
const applied = applyTarsTraitChange(base, { trait: "humor", value: 60, mode: "set" });
check("apply humor 60", applied.to === 60 && applied.traits.humor === 60);

const reply = tarsTraitChangeReply("humor", 75, 60, applied.traits);
check("reply mentions gotowe", reply.toLowerCase().includes("gotowe"));
check("reply mentions humor", reply.toLowerCase().includes("humor"));

process.exit(failures === 0 ? 0 : 1);
