import { isStopCommand, progressLine } from "../src/long-work.js";

let failures = 0;
function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

check("przerwij", isStopCommand("Proszę, przerwij to zadanie."));
check("stop", isStopCommand("Stop, wystarczy."));
check("not stop", !isStopCommand("Kontynuuj pracę nad aplikacją UiPath."));
check("uipa not stop", !isStopCommand("Odpalę to w UIPa jak wcześniej."));
check("progress line", progressLine(0, 45).includes("45"));

process.exit(failures === 0 ? 0 : 1);
