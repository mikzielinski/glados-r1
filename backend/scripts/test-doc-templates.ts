import { DocTemplateStore } from "../src/doc-templates.js";

let failures = 0;

function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

const store = new DocTemplateStore({
  templateDir: "/tmp/oko-templates-test",
  templateMaxChars: 5000,
  templateMaxEntryChars: 8000,
  templateMaxEntries: 10,
  memoryMaxUploadBytes: 1024 * 1024,
} as import("../src/config.js").Config);

const a = await store.upsert({
  name: "README API",
  description: "REST docs",
  content: "Sekcje: Opis, Endpointy, Przykłady",
});
check("create template", a.name === "README API");

const b = await store.upsert({
  id: a.id,
  name: "README API v2",
  content: "Zaktualizowana treść szablonu",
});
check("update template", b.name === "README API v2" && b.id === a.id);

const block = await store.getPromptBlock("README");
check("prompt block", block.includes("SZABLONY DOKUMENTACJI") && block.includes("README API v2"));

await store.remove(a.id);
check("remove template", (await store.list()).length === 0);

process.exit(failures === 0 ? 0 : 1);
