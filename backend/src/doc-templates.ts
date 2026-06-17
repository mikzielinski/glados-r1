import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { Config } from "./config.js";
import { logger } from "./logger.js";
import { extractTextFromFile } from "./text-extract.js";

const log = logger("templates");

export interface DocTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  source?: string;
  createdAt: number;
  updatedAt: number;
}

interface TemplateFile {
  templates: DocTemplate[];
}

/** Named documentation templates — separate from code standards PDFs and memory facts. */
export class DocTemplateStore {
  private cache: TemplateFile | null = null;

  constructor(private readonly cfg: Config) {}

  get count(): number {
    return this.cache?.templates.length ?? 0;
  }

  async list(): Promise<DocTemplate[]> {
    const file = await this.load();
    return [...file.templates].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async get(id: string): Promise<DocTemplate | null> {
    const file = await this.load();
    return file.templates.find((t) => t.id === id) ?? null;
  }

  async upsert(data: {
    id?: string;
    name: string;
    description?: string;
    content: string;
    source?: string;
  }): Promise<DocTemplate> {
    const name = data.name.trim().slice(0, 120);
    const content = data.content.trim().slice(0, this.cfg.templateMaxEntryChars);
    if (name.length < 2) throw new Error("Podaj nazwę szablonu (min. 2 znaki).");
    if (content.length < 4) throw new Error("Treść szablonu jest pusta.");

    const file = await this.load();
    const now = Date.now();
    const existing = data.id ? file.templates.find((t) => t.id === data.id) : undefined;
    const byName = file.templates.find((t) => t.name.toLowerCase() === name.toLowerCase() && t.id !== data.id);

    if (existing) {
      existing.name = name;
      existing.description = (data.description ?? existing.description).trim().slice(0, 240);
      existing.content = content;
      existing.source = data.source ?? existing.source;
      existing.updatedAt = now;
      await this.save(file);
      log.info(`template updated: ${existing.name}`);
      return existing;
    }

    if (byName) {
      byName.description = (data.description ?? byName.description).trim().slice(0, 240);
      byName.content = content;
      byName.source = data.source ?? byName.source;
      byName.updatedAt = now;
      await this.save(file);
      log.info(`template updated by name: ${byName.name}`);
      return byName;
    }

    const entry: DocTemplate = {
      id: randomUUID(),
      name,
      description: (data.description ?? "").trim().slice(0, 240),
      content,
      source: data.source,
      createdAt: now,
      updatedAt: now,
    };
    file.templates.unshift(entry);
    this.trim(file);
    await this.save(file);
    log.info(`template created: ${entry.name}`);
    return entry;
  }

  async ingestFile(name: string, filename: string, data: Buffer): Promise<DocTemplate> {
    if (data.length > this.cfg.memoryMaxUploadBytes) {
      throw new Error(`Plik za duży (max ${Math.round(this.cfg.memoryMaxUploadBytes / 1024)} KB).`);
    }
    const text = await extractTextFromFile(filename, data);
    if (!text.trim()) throw new Error("Plik nie zawiera tekstu.");
    return this.upsert({
      name: name.trim() || filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
      description: `Import z ${filename}`,
      content: text,
      source: filename,
    });
  }

  async remove(id: string): Promise<boolean> {
    const file = await this.load();
    const before = file.templates.length;
    file.templates = file.templates.filter((t) => t.id !== id);
    if (file.templates.length === before) return false;
    await this.save(file);
    return true;
  }

  async getPromptBlock(query = "", maxChars = this.cfg.templateMaxChars): Promise<string> {
    const templates = await this.list();
    if (templates.length === 0) return "";

    const ranked = rankTemplates(templates, query);
    const header =
      `SZABLONY DOKUMENTACJI (${templates.length} — używaj TYLKO przy generowaniu docs/README/procedur, NIE przy code review):\n`;
    let body = "";
    for (const t of ranked) {
      const desc = t.description ? ` — ${t.description}` : "";
      const chunk = `\n### ${t.name}${desc}\n${t.content.trim()}\n`;
      if ((header + body + chunk).length > maxChars) {
        const room = maxChars - header.length - body.length - 60;
        if (room > 120) {
          body += `\n### ${t.name}${desc}\n${t.content.trim().slice(0, room)}…\n`;
        }
        break;
      }
      body += chunk;
    }
    return header + body;
  }

  private trim(file: TemplateFile): void {
    while (file.templates.length > this.cfg.templateMaxEntries) {
      file.templates.pop();
    }
  }

  private async load(): Promise<TemplateFile> {
    if (this.cache) return this.cache;
    await mkdir(this.cfg.templateDir, { recursive: true });
    try {
      const raw = JSON.parse(await readFile(this.path(), "utf8")) as TemplateFile;
      raw.templates = Array.isArray(raw.templates) ? raw.templates : [];
      this.cache = raw;
      return raw;
    } catch {
      const fresh: TemplateFile = { templates: [] };
      this.cache = fresh;
      return fresh;
    }
  }

  private async save(file: TemplateFile): Promise<void> {
    await mkdir(this.cfg.templateDir, { recursive: true });
    await writeFile(this.path(), JSON.stringify(file, null, 2), "utf8");
    this.cache = file;
  }

  private path(): string {
    return join(this.cfg.templateDir, "templates.json");
  }
}

function rankTemplates(templates: DocTemplate[], query: string): DocTemplate[] {
  const q = query.toLowerCase();
  if (!q.trim()) return templates;
  const terms = q.split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return templates;
  return [...templates].sort((a, b) => scoreTemplate(b, terms) - scoreTemplate(a, terms));
}

function scoreTemplate(t: DocTemplate, terms: string[]): number {
  const hay = `${t.name} ${t.description} ${t.content}`.toLowerCase();
  let s = 0;
  for (const term of terms) {
    if (hay.includes(term)) s += term.length;
  }
  return s;
}
