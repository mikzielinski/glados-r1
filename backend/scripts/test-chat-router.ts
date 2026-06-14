import { tryChatReply } from "../src/chat-router.js";
import { tryDeviceReply } from "../src/device-router.js";

const ctx = { batteryPct: 55 };
let failures = 0;

function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

check("capabilities template", tryChatReply("co potrafisz zrobić?", ctx) != null);
check("UIPa is not goodbye", tryChatReply(
  "Będę ją odpalał w UIPa w tak jak poszednio dpd-manager.",
  ctx,
) == null);
check("pa still goodbye (GLaDOS)", tryChatReply("pa, do widzenia", ctx, "glados")?.includes("Ciasto") ?? false);
check("HAL whoami tone", tryDeviceReply("kim jesteś", ctx, "hal9000")?.includes("HAL") ?? false);
check("HAL no Dave in battery", tryDeviceReply("ile baterii", ctx, "hal9000")?.includes("Dave") === false);
check("HAL personality", tryDeviceReply("opowiedz o sobie", ctx, "hal9000")?.includes("HAL") ?? false);
check("GLaDOS personality", tryChatReply("jaka masz osobowość", ctx, "glados")?.includes("GLaDOS") ?? false);
check("TARS whoami tone", tryDeviceReply("kim jesteś", ctx, "tars")?.includes("TARS") ?? false);

process.exit(failures === 0 ? 0 : 1);
