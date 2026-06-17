import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "./config.js";
import type { DocTemplateStore } from "./doc-templates.js";
import { logger } from "./logger.js";
import type { MemoryEntry, MemoryStore } from "./memory-store.js";
import { GLOBAL_MEMORY_DEVICE } from "./memory-store.js";
import type { StandardsRegistry } from "./standards.js";

const log = logger("rag");

export type RagSourceType = "memory" | "standard" | "template";
export type RagStatusKind = "empty" | "indexing" | "ready" | "stale" | "error";

export interface RagSourceStatus {
  type: RagSourceType;
  id: string;
  title: string;
  deviceId?: string;
  chunks: number;
  chars: number;
  fingerprint: string;
  indexedAt: number | null;
  inRag: boolean;
}

export interface RagChunkHit {
  id: string;
  sourceType: RagSourceType;
  sourceId: string;
  title: string;
  text: string;
  score: number;
  deviceId?: string;
}

export interface RagStatus {
  status: RagStatusKind;
  ready: boolean;
  chunkCount: number;
  sourceCount: number;
  lastIndexedAt: number | null;
  lastError: string | null;
  embeddings: boolean;
  embedModel: string;
  staleSources: number;
  sources: RagSourceStatus[];
}

interface RagChunk {
  id: string;
  sourceType: RagSourceType;
  sourceId: string;
  deviceId?: string;
  title: string;
  text: string;
  fingerprint: string;
  embedding?: number[];
}

interface RagFile {
  version: 1;
  lastIndexedAt: number | null;
  lastError: string | null;
  embeddings: boolean;
  embedModel: string;
  chunks: RagChunk[];
  sources: RagSourceStatus[];
}

interface RawSource {
  type: RagSourceType;
  id: string;
  title: string;
  deviceId?: string;
  text: string;
}

/**
 * Local RAG index over memory facts, PDF standards and doc templates.
 * Persists chunks on disk; optional Ollama embeddings for semantic search.
 */
export class KnowledgeIndex {
  private chunks: RagChunk[] = [];
  private sources: RagSourceStatus[] = [];
  private lastIndexedAt: number | null = null;
  private lastError: string | null = null;
  private embeddingsEnabled = false;
  private indexing: Promise<void> | null = null;
  private reindexTimer?: ReturnType<typeof setTimeout>;
  private staleFlag = false;

  constructor(
    private readonly cfg: Config,
    private readonly memory: MemoryStore,
    private readonly standards: StandardsRegistry,
    private readonly templates: DocTemplateStore,
  ) {}

  isReady(): boolean {
    return this.chunks.length > 0 && this.lastError == null && !this.staleFlag && !this.indexing;
  }

  markStale(): void {
    this.staleFlag = true;
  }

  getStatus(): RagStatus {
    const stale = this.staleFlag ? Math.max(1, this.countStale()) : this.countStale();
    let status: RagStatusKind = "empty";
    if (this.indexing) status = "indexing";
    else if (this.lastError) status = "error";
    else if (this.chunks.length === 0) status = "empty";
    else if (this.staleFlag || stale > 0) status = "stale";
    else status = "ready";

    return {
      status,
      ready: status === "ready",
      chunkCount: this.chunks.length,
      sourceCount: this.sources.length,
      lastIndexedAt: this.lastIndexedAt,
      lastError: this.lastError,
      embeddings: this.embeddingsEnabled,
      embedModel: this.cfg.ragEmbedModel,
      staleSources: stale,
      sources: [...this.sources],
    };
  }

  scheduleReindex(delayMs = 800): void {
    this.staleFlag = true;
    if (this.reindexTimer) clearTimeout(this.reindexTimer);
    this.reindexTimer = setTimeout(() => {
      this.reindexTimer = undefined;
      void this.reindex().catch((err) => log.warn("scheduled reindex failed", err));
    }, delayMs);
    this.reindexTimer.unref?.();
  }

  async load(): Promise<void> {
    await mkdir(this.cfg.ragDir, { recursive: true });
    try {
      const raw = JSON.parse(await readFile(this.indexPath(), "utf8")) as RagFile;
      if (raw.version !== 1) throw new Error("unsupported rag version");
      this.chunks = Array.isArray(raw.chunks) ? raw.chunks : [];
      this.sources = Array.isArray(raw.sources) ? raw.sources : [];
      this.lastIndexedAt = raw.lastIndexedAt ?? null;
      this.lastError = raw.lastError ?? null;
      this.embeddingsEnabled = Boolean(raw.embeddings);
      log.info(`rag loaded ${this.chunks.length} chunks from disk`);
    } catch {
      this.chunks = [];
      this.sources = [];
    }
  }

  async reindex(force = false): Promise<RagStatus> {
    if (this.indexing) {
      await this.indexing;
      return this.getStatus();
    }
    this.indexing = this.doReindex(force).finally(() => {
      this.indexing = null;
    });
    await this.indexing;
    return this.getStatus();
  }

  async search(query: string, opts: { deviceId?: string; limit?: number } = {}): Promise<RagChunkHit[]> {
    const q = query.trim();
    if (!q || this.chunks.length === 0) return [];

    const deviceId = opts.deviceId;
    const pool = this.chunks.filter((c) => {
      if (c.sourceType !== "memory") return true;
      if (!deviceId) return true;
      return !c.deviceId || c.deviceId === GLOBAL_MEMORY_DEVICE || c.deviceId === deviceId;
    });

    const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const queryVec = this.embeddingsEnabled ? await this.embedText(q) : null;

    const scored = pool.map((chunk) => {
      const kw = keywordScore(chunk, terms);
      let sem = 0;
      if (queryVec && chunk.embedding?.length) {
        sem = cosineSimilarity(queryVec, chunk.embedding);
      }
      const score = queryVec && chunk.embedding?.length ? sem * 0.65 + kw * 0.35 : kw;
      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const limit = opts.limit ?? 8;
    return scored
      .filter((s) => s.score > 0.01)
      .slice(0, limit)
      .map(({ chunk, score }) => ({
        id: chunk.id,
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        title: chunk.title,
        text: chunk.text,
        score: Math.round(score * 1000) / 1000,
        deviceId: chunk.deviceId,
      }));
  }

  async getPromptBlock(deviceId: string, query = "", maxChars = this.cfg.ragMaxRetrieveChars): Promise<string> {
    if (this.chunks.length === 0) return "";
    const hits = await this.search(query || "kontekst użytkownika projekt", {
      deviceId,
      limit: 12,
    });
    if (hits.length === 0) {
      return this.getStatus().ready
        ? "INDEKS RAG: gotowy, ale brak trafień dla tego zapytania."
        : "";
    }

    const header =
      `WIEDZA Z INDEKSU RAG (${hits.length} fragmentów — pamięć, standardy PDF, szablony docs):\n`;
    let body = "";
    for (const hit of hits) {
      const label =
        hit.sourceType === "memory" ? "pamięć" :
        hit.sourceType === "standard" ? "standard PDF" :
        "szablon docs";
      const chunk = `\n• [${label}] ${hit.title}: ${hit.text.trim()}\n`;
      if (body.length === 0 && chunk.length + header.length > maxChars) {
        body += `\n• [${label}] ${hit.title}: ${hit.text.trim().slice(0, Math.max(120, maxChars - header.length - 80))}…\n`;
        break;
      }
      if ((header + body + chunk).length > maxChars) break;
      body += chunk;
    }
    return body.trim() ? header + body : "";
  }

  private async doReindex(force: boolean): Promise<void> {
    this.lastError = null;
    log.info(`rag reindex start force=${force}`);
    try {
      await this.standards.refreshIfStale(0);
      const rawSources = await this.collectSources();
      if (rawSources.length === 0) {
        this.chunks = [];
        this.sources = [];
        this.lastIndexedAt = Date.now();
        this.embeddingsEnabled = false;
        await this.persist();
        log.info("rag reindex: no sources");
        return;
      }

      const fpByKey = new Map(rawSources.map((s) => [sourceKey(s), fingerprint(s.text)]));
      if (!force && this.chunks.length > 0) {
        const same =
          this.sources.length === rawSources.length &&
          rawSources.every((s) => {
            const prev = this.sources.find((x) => x.type === s.type && x.id === s.id);
            return prev && prev.fingerprint === fpByKey.get(sourceKey(s));
          });
        if (same) {
          log.info("rag reindex: sources unchanged — skip");
          return;
        }
      }

      const nextChunks: RagChunk[] = [];
      const nextSources: RagSourceStatus[] = [];
      let embedOk = false;

      for (const src of rawSources) {
        const fp = fpByKey.get(sourceKey(src))!;
        const parts = chunkText(src.text, this.cfg.ragChunkChars);
        const vecs: Array<number[] | null> = [];
        for (const part of parts) {
          vecs.push(await this.embedText(part));
        }
        if (vecs.some(Boolean)) embedOk = true;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i]!;
          nextChunks.push({
            id: randomUUID(),
            sourceType: src.type,
            sourceId: src.id,
            deviceId: src.deviceId,
            title: parts.length > 1 ? `${src.title} (${i + 1}/${parts.length})` : src.title,
            text: part,
            fingerprint: fp,
            embedding: vecs[i] ?? undefined,
          });
        }

        nextSources.push({
          type: src.type,
          id: src.id,
          title: src.title,
          deviceId: src.deviceId,
          chunks: parts.length,
          chars: src.text.length,
          fingerprint: fp,
          indexedAt: Date.now(),
          inRag: parts.length > 0,
        });
      }

      this.chunks = nextChunks;
      this.sources = nextSources;
      this.lastIndexedAt = Date.now();
      this.embeddingsEnabled = embedOk;
      this.staleFlag = false;
      await this.persist();
      log.info(
        `rag reindex done: ${nextSources.length} sources, ${nextChunks.length} chunks, embeddings=${embedOk}`,
      );
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      await this.persist();
      log.error("rag reindex failed", err);
      throw err;
    }
  }

  private async collectSources(): Promise<RawSource[]> {
    const out: RawSource[] = [];

    const memFiles = await this.listMemoryFiles();
    for (const { deviceId, entries } of memFiles) {
      for (const e of entries) {
        out.push({
          type: "memory",
          id: e.id,
          title: e.title,
          deviceId,
          text: e.content,
        });
      }
    }

    for (const doc of this.standards.getDocuments()) {
      if (!doc.text.trim()) continue;
      out.push({
        type: "standard",
        id: doc.filename,
        title: doc.name,
        text: doc.text,
      });
    }

    for (const tpl of await this.templates.list()) {
      if (!tpl.content.trim()) continue;
      out.push({
        type: "template",
        id: tpl.id,
        title: tpl.name,
        text: `${tpl.description}\n\n${tpl.content}`.trim(),
      });
    }

    return out;
  }

  private async listMemoryFiles(): Promise<Array<{ deviceId: string; entries: MemoryEntry[] }>> {
    const result: Array<{ deviceId: string; entries: MemoryEntry[] }> = [];
    await mkdir(this.cfg.memoryDir, { recursive: true });
    const files = (await readdir(this.cfg.memoryDir)).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const deviceId = file.replace(/\.json$/, "");
      const status = await this.memory.getStatus(deviceId);
      if (status.count === 0) continue;
      const raw = JSON.parse(await readFile(join(this.cfg.memoryDir, file), "utf8")) as {
        entries?: MemoryEntry[];
      };
      const entries = Array.isArray(raw.entries) ? raw.entries : [];
      if (entries.length > 0) result.push({ deviceId, entries });
    }
    return result;
  }

  private async embedText(text: string): Promise<number[] | null> {
    if (!this.cfg.ragEnabled) return null;
    try {
      const resp = await fetch(`${this.cfg.ollamaBaseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: this.cfg.ragEmbedModel, prompt: text.slice(0, 2000) }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!resp.ok) return null;
      const body = (await resp.json()) as { embedding?: number[] };
      return body.embedding?.length ? body.embedding : null;
    } catch {
      return null;
    }
  }

  private isStale(): boolean {
    return this.countStale() > 0;
  }

  private countStale(): number {
    return this.sources.filter((s) => !s.inRag || s.indexedAt == null).length;
  }

  private indexPath(): string {
    return join(this.cfg.ragDir, "index.json");
  }

  private async persist(): Promise<void> {
    await mkdir(this.cfg.ragDir, { recursive: true });
    const file: RagFile = {
      version: 1,
      lastIndexedAt: this.lastIndexedAt,
      lastError: this.lastError,
      embeddings: this.embeddingsEnabled,
      embedModel: this.cfg.ragEmbedModel,
      chunks: this.chunks,
      sources: this.sources,
    };
    await writeFile(this.indexPath(), JSON.stringify(file), "utf8");
  }
}

function sourceKey(s: RawSource): string {
  return `${s.type}:${s.deviceId ?? ""}:${s.id}`;
}

function fingerprint(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function chunkText(text: string, maxChars: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  const chunks: string[] = [];
  const paras = trimmed.split(/\n\s*\n/);
  let buf = "";
  for (const para of paras) {
    const piece = para.trim();
    if (!piece) continue;
    if (buf.length + piece.length + 2 <= maxChars) {
      buf = buf ? `${buf}\n\n${piece}` : piece;
      continue;
    }
    if (buf) {
      chunks.push(buf);
      buf = "";
    }
    if (piece.length <= maxChars) {
      buf = piece;
      continue;
    }
    for (let i = 0; i < piece.length; i += maxChars) {
      chunks.push(piece.slice(i, i + maxChars));
    }
  }
  if (buf) chunks.push(buf);
  return chunks.length ? chunks : [trimmed.slice(0, maxChars)];
}

function keywordScore(chunk: RagChunk, terms: string[]): number {
  if (terms.length === 0) return 0.1;
  const hay = `${chunk.title} ${chunk.text}`.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (hay.includes(t)) s += Math.min(t.length, 12);
  }
  return s / (terms.length * 8);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
