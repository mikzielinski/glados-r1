import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import type { Config } from "./config.js";
import { logger } from "./logger.js";

const log = logger("standards");

export interface StandardDoc {
  name: string;
  filename: string;
  text: string;
  mtimeMs: number;
}

/**
 * Loads PDF standards from STANDARDS_DIR (extracts text via pdftotext).
 * Injected into cloud agent prompts for code/integration work.
 */
export class StandardsRegistry {
  private docs: StandardDoc[] = [];
  private lastScanMs = 0;
  private readonly dir: string;

  constructor(private readonly cfg: Config) {
    this.dir = resolve(cfg.standardsDir);
  }

  get count(): number {
    return this.docs.length;
  }

  getNames(): string[] {
    return this.docs.map((d) => d.name);
  }

  async refreshIfStale(maxAgeMs = 5000): Promise<void> {
    if (Date.now() - this.lastScanMs < maxAgeMs) return;
    await this.scan();
  }

  async getPromptBlock(maxChars = this.cfg.standardsMaxChars): Promise<string> {
    await this.refreshIfStale();
    if (this.docs.length === 0) {
      return "STANDARDY PDF: brak — wrzuć pliki *.pdf do katalogu standards/ i zrestartuj backend.";
    }

    const header = `STANDARDY PDF (${this.docs.length} dokumentów) — stosuj przy kodzie, review i automatyzacji:\n`;
    let body = "";
    for (const doc of this.docs) {
      const chunk = `\n--- ${doc.name} (${doc.filename}) ---\n${doc.text.trim()}\n`;
      if ((header + body + chunk).length > maxChars) {
        const room = maxChars - header.length - body.length - 80;
        if (room > 200) {
          body += `\n--- ${doc.name} (${doc.filename}) ---\n${doc.text.trim().slice(0, room)}…\n`;
        }
        break;
      }
      body += chunk;
    }
    return header + body;
  }

  private async scan(): Promise<void> {
    this.lastScanMs = Date.now();
    let entries: string[];
    try {
      entries = await readdir(this.dir);
    } catch {
      log.warn(`standards dir missing: ${this.dir}`);
      this.docs = [];
      return;
    }

    const pdfs = entries.filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
    const docs: StandardDoc[] = [];
    for (const filename of pdfs) {
      const path = join(this.dir, filename);
      try {
        const st = await stat(path);
        const text = await extractPdfText(path);
        const name = filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
        docs.push({ name, filename, text, mtimeMs: st.mtimeMs });
        log.info(`standard loaded: ${filename} (${text.length} chars)`);
      } catch (err) {
        log.warn(`failed to load standard ${filename}`, err);
      }
    }
    this.docs = docs;
    if (docs.length === 0) {
      log.info(`no PDF standards in ${this.dir}`);
    }
  }
}

async function extractPdfText(pdfPath: string): Promise<string> {
  try {
    return await pdftotext(pdfPath);
  } catch {
    log.warn(`pdftotext unavailable for ${pdfPath} — install: brew install poppler`);
    const raw = await readFile(pdfPath);
    if (raw.length < 64) return "";
    return `[PDF ${pdfPath} — zainstaluj poppler (pdftotext) aby wczytać treść]`;
  }
}

function pdftotext(pdfPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, "-"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", (e) => reject(e));
    proc.on("close", (code) => {
      if (code === 0 && out.trim()) resolve(out);
      else reject(new Error(err.slice(-200) || `pdftotext exit ${code}`));
    });
  });
}
