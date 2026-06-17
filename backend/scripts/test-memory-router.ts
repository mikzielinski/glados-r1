import {
  isForceLearnQuery,
  isMemoryClearAllQuery,
  isMemoryClearQuery,
  isMemoryListQuery,
  parseLearnPayload,
} from "../src/memory-router.js";

let failures = 0;

function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

check("parse learn PL", parseLearnPayload("zapamiętaj, że lubię kawę") === "lubię kawę");
check("parse learn EN", parseLearnPayload("remember: API key is in vault") === "API key is in vault");
check("list query", isMemoryListQuery("co pamiętasz?") === true);
check("force learn", isForceLearnQuery("wymuś naukę") === true);
check("clear memory", isMemoryClearQuery("wyczyść pamięć") === true);
check("clear all memory", isMemoryClearAllQuery("wyczyść całą pamięć") === true);
check("clear all not device", isMemoryClearQuery("wyczyść całą pamięć") === false);
check("reset memory", isMemoryClearAllQuery("reset pamięci") === true);
check("unrelated", parseLearnPayload("jaka pogoda") === null);

process.exit(failures === 0 ? 0 : 1);
