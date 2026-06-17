import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { Config } from "./config.js";
import { logger } from "./logger.js";
import { extractTextFromFile } from "./text-extract.js";

export const GLOBAL_MEMORY_DEVICE = "global";

const log = logger("memory");

export type MemoryKind = "fact" | "note" | "document";

export interface MemoryEntry {
  id: string;
  kind: MemoryKind;
  title: string;
  content: string;
  source?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryStatusEntry {
  id: string;
  kind: MemoryKind;
  title: string;
  preview: string;
  source?: string;
  updatedAt: number;
}

interface MemoryFile {
  deviceId: string;
  userName?: string;
  entries: MemoryEntry[];
}

export class MemoryStore {
  private readonly cache = new Map<string, MemoryFile>();

  constructor(private readonly cfg: Config) {}

  async count(deviceId: string): Promise<number> {
    const file = await this.load(deviceId);
    return file.entries.length;
  }

  async getUserName(deviceId: string): Promise<string | undefined> {
    return (await this.load(deviceId)).userName;
  }

  async setUserName(deviceId: string, userName: string): Promise<void> {
    const file = await this.load(deviceId);
    file.userName = userName.trim().slice(0, 40) || undefined;
    await this.save(file);
  }

  async learnText(
    deviceId: string,
    content: string,
    opts: { title?: string; kind?: MemoryKind; source?: string; force?: boolean } = {},
  ): Promise<MemoryEntry> {
    const trimmed = content.trim();
    if (trimmed.length < 2) {
      throw new Error("Treść do zapamiętania jest pusta.");
    }
    const file = await this.load(deviceId);
    if (!opts.force) {
      const dup = file.entries.find(
        (e) => e.content.trim() === trimmed || e.title === (opts.title ?? "").trim(),
      );
      if (dup) return dup;
    }

    const nameMatch = trimmed.match(
      /^(?:nazywaj mnie|mam na imię|mam na imie|call me|my name is)\s+(.{2,40})$/i,
    );
    if (nameMatch?.[1]) {
      file.userName = nameMatch[1].trim();
    }

    const entry: MemoryEntry = {
      id: randomUUID(),
      kind: opts.kind ?? "note",
      title: (opts.title ?? autoTitle(trimmed)).slice(0, 120),
      content: trimmed.slice(0, this.cfg.memoryMaxEntryChars),
      source: opts.source,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    file.entries.unshift(entry);
    this.trimEntries(file);
    await this.save(file);
    log.info(`memory ${deviceId}: learned "${entry.title}" (${entry.content.length} chars)`);
    return entry;
  }

  async ingestFile(
    deviceId: string,
    filename: string,
    data: Buffer,
    force = false,
  ): Promise<MemoryEntry> {
    if (data.length > this.cfg.memoryMaxUploadBytes) {
      throw new Error(
        `Plik za duży (${Math.round(data.length / 1024)} KB, max ${Math.round(this.cfg.memoryMaxUploadBytes / 1024)} KB).`,
      );
    }
    const text = await extractTextFromFile(filename, data);
    if (!text.trim()) throw new Error("Plik nie zawiera tekstu do nauki.");
    return this.learnText(deviceId, text, {
      title: filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
      kind: "document",
      source: filename,
      force,
    });
  }

  async forget(deviceId: string, entryId: string): Promise<boolean> {
    const file = await this.load(deviceId);
    const before = file.entries.length;
    file.entries = file.entries.filter((e) => e.id !== entryId);
    if (file.entries.length === before) return false;
    await this.save(file);
    return true;
  }

  async clear(deviceId: string): Promise<number> {
    const file = await this.load(deviceId);
    const n = file.entries.length;
    file.entries = [];
    await this.save(file);
    return n;
  }

  statusEntries(entries: MemoryEntry[]): MemoryStatusEntry[] {
    return entries.map((e) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      preview: e.content.slice(0, 160).replace(/\s+/g, " "),
      source: e.source,
      updatedAt: e.updatedAt,
    }));
  }

  async getStatus(deviceId: string): Promise<{ count: number; userName?: string; entries: MemoryStatusEntry[] }> {
    const file = await this.load(deviceId);
    return {
      count: file.entries.length,
      userName: file.userName,
      entries: this.statusEntries(file.entries.slice(0, 20)),
    };
  }

  async getPromptBlock(deviceId: string, query = "", maxChars = this.cfg.memoryMaxChars): Promise<string> {
    const globalFile = await this.load(GLOBAL_MEMORY_DEVICE);
    const deviceFile = deviceId === GLOBAL_MEMORY_DEVICE ? globalFile : await this.load(deviceId);
    const combined = [...globalFile.entries, ...deviceFile.entries.filter((e) => !globalFile.entries.some((g) => g.id === e.id))];
    if (combined.length === 0) return "";

    const ranked = rankEntries(combined, query);
    const userName = deviceFile.userName ?? globalFile.userName;
    const nameLine = userName
      ? `Imię użytkownika: ${userName}. NIGDY nie mów «Dave», chyba że imię to Dave.\n`
      : "NIGDY nie nazywaj użytkownika «Dave».\n";
    const header =
      `FAKTY I NOTATKI (${combined.length} wpisów — kontekst użytkownika, NIE szablony docs):\n` +
      nameLine;
    let body = "";
    for (const entry of ranked) {
      const chunk = `\n• [${entry.kind}] ${entry.title}: ${entry.content.trim()}\n`;
      if ((header + body + chunk).length > maxChars) break;
      body += chunk;
    }
    return body.trim() ? header + body : "";
  }

  private trimEntries(file: MemoryFile): void {
    while (file.entries.length > this.cfg.memoryMaxEntries) {
      file.entries.pop();
    }
  }

  private async load(deviceId: string): Promise<MemoryFile> {
    const id = sanitizeDeviceId(deviceId);
    const cached = this.cache.get(id);
    if (cached) return cached;

    await mkdir(this.cfg.memoryDir, { recursive: true });
    const path = this.path(id);
    try {
      const raw = JSON.parse(await readFile(path, "utf8")) as MemoryFile;
      raw.deviceId = id;
      raw.entries = Array.isArray(raw.entries) ? raw.entries : [];
      this.cache.set(id, raw);
      return raw;
    } catch {
      const fresh: MemoryFile = { deviceId: id, entries: [] };
      this.cache.set(id, fresh);
      return fresh;
    }
  }

  private async save(file: MemoryFile): Promise<void> {
    await mkdir(this.cfg.memoryDir, { recursive: true });
    await writeFile(this.path(file.deviceId), JSON.stringify(file, null, 2), "utf8");
    this.cache.set(file.deviceId, file);
  }

  private path(deviceId: string): string {
    return join(this.cfg.memoryDir, `${deviceId}.json`);
  }
}

function sanitizeDeviceId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return safe || "default";
}

function autoTitle(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= 48) return oneLine;
  return `${oneLine.slice(0, 45)}…`;
}

function rankEntries(entries: MemoryEntry[], query: string): MemoryEntry[] {
  const q = query.toLowerCase();
  if (!q.trim()) return [...entries];
  const terms = q.split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return [...entries];

  return [...entries].sort((a, b) => score(b, terms) - score(a, terms));
}

function score(entry: MemoryEntry, terms: string[]): number {
  const hay = `${entry.title} ${entry.content}`.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (hay.includes(t)) s += t.length;
  }
  return s;
}
