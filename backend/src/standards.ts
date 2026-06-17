import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
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

  list(): { filename: string; name: string; chars: number }[] {
    return this.docs.map((d) => ({
      filename: d.filename,
      name: d.name,
      chars: d.text.length,
    }));
  }

  getDocuments(): StandardDoc[] {
    return [...this.docs];
  }

  /** Save a PDF to STANDARDS_DIR and rescan immediately. */
  async savePdf(filename: string, data: Buffer): Promise<StandardDoc> {
    const safe = sanitizePdfFilename(filename);
    if (data.length < 64) throw new Error("Plik PDF jest pusty lub uszkodzony.");
    if (data.length > 20 * 1024 * 1024) throw new Error("PDF za duży (max 20 MB).");
    await mkdir(this.dir, { recursive: true });
    const path = join(this.dir, safe);
    await writeFile(path, data);
    this.lastScanMs = 0;
    await this.scan();
    const doc = this.docs.find((d) => d.filename === safe);
    if (!doc) {
      throw new Error(
        "PDF zapisany, ale nie udało się wyciągnąć tekstu — sprawdź czy poppler (pdftotext) jest zainstalowany.",
      );
    }
    return doc;
  }

  /** Remove a PDF from STANDARDS_DIR. */
  async deletePdf(filename: string): Promise<boolean> {
    const safe = sanitizePdfFilename(filename);
    const path = join(this.dir, safe);
    try {
      await unlink(path);
      this.lastScanMs = 0;
      await this.scan();
      return true;
    } catch {
      return false;
    }
  }

  async refreshIfStale(maxAgeMs = 5000): Promise<void> {
    if (Date.now() - this.lastScanMs < maxAgeMs) return;
    await this.scan();
  }

  async getPromptBlock(maxChars = this.cfg.standardsMaxChars): Promise<string> {
    await this.refreshIfStale();
    if (this.docs.length === 0) {
      return "STANDARDY PDF: brak — wrzuć pliki *.pdf do katalogu standards/ lub wgraj w /setup → Standardy kodu.";
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

function sanitizePdfFilename(filename: string): string {
  let base = basename(filename.trim()).replace(/[^\w.\- ()ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+/g, "_");
  if (!base.toLowerCase().endsWith(".pdf")) base += ".pdf";
  if (base.length < 5) throw new Error("Nieprawidłowa nazwa pliku PDF.");
  return base;
}

/** Whether pdftotext (poppler) is on PATH — needed to read PDF standards. */
export async function isPopplerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("pdftotext", ["-v"], { stdio: "ignore" });
    proc.on("error", () => resolve(false));
    proc.on("close", () => resolve(true));
  });
}
