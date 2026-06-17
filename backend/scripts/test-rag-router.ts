import { loadConfig } from "../src/config.js";
import { MemoryStore } from "../src/memory-store.js";
import { StandardsRegistry } from "../src/standards.js";
import { DocTemplateStore } from "../src/doc-templates.js";
import { KnowledgeIndex } from "../src/knowledge-index.js";
import { formatRagStatus, isRagReindexQuery, isRagStatusQuery } from "../src/rag-router.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const memory = new MemoryStore(cfg);
  const standards = new StandardsRegistry(cfg);
  await standards.refreshIfStale(0);
  const templates = new DocTemplateStore(cfg);
  const rag = new KnowledgeIndex(cfg, memory, standards, templates);
  await rag.load();

  if (!isRagStatusQuery("jaki jest status indeksu rag")) {
    throw new Error("rag status query detection failed");
  }
  if (!isRagReindexQuery("wymuś indeksowanie wiedzy")) {
    throw new Error("rag reindex query detection failed");
  }

  const status = await rag.reindex(true);
  if (status.sourceCount === 0 && status.status !== "empty") {
    throw new Error(`expected empty status, got ${status.status}`);
  }

  const reply = formatRagStatus(status);
  if (!reply.includes("RAG") && !reply.includes("pust")) {
    throw new Error(`unexpected status reply: ${reply}`);
  }

  await memory.learnText("global", "Test RAG: projekt OKO używa Rabbit R1.", {
    title: "Test RAG",
    force: true,
  });
  const afterLearn = await rag.reindex(true);
  if (afterLearn.chunkCount < 1) {
    throw new Error("expected chunks after learn");
  }

  const hits = await rag.search("Rabbit R1", { deviceId: "global" });
  if (!hits.some((h) => h.text.includes("Rabbit"))) {
    throw new Error(`search missed Rabbit R1: ${JSON.stringify(hits)}`);
  }

  const block = await rag.getPromptBlock("global", "Rabbit R1");
  if (!block.includes("RAG") && !block.includes("Rabbit")) {
    throw new Error(`prompt block unexpected: ${JSON.stringify(block.slice(0, 120))}`);
  }

  console.log("rag-router: OK");
  console.log(`  status=${afterLearn.status} chunks=${afterLearn.chunkCount} ready=${afterLearn.ready}`);
  console.log(`  search hits=${hits.length} top=${hits[0]?.title ?? "none"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
