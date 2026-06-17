import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { logger } from "./logger.js";

const log = logger("text-extract");

export async function extractTextFromFile(filename: string, data: Buffer): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return extractPdfBuffer(data, filename);
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv") || lower.endsWith(".json")) {
    return data.toString("utf8").trim();
  }
  throw new Error(`Nieobsługiwany typ pliku: ${filename} (PDF, TXT, MD, CSV, JSON)`);
}

async function extractPdfBuffer(data: Buffer, label: string): Promise<string> {
  try {
    return await pdftotextStdin(data);
  } catch (err) {
    log.warn(`pdftotext failed for ${label}`, err);
    throw new Error(
      `Nie udało się odczytać PDF (${label}). Zainstaluj poppler: brew install poppler`,
    );
  }
}

function pdftotextStdin(data: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("pdftotext", ["-layout", "-enc", "UTF-8", "-", "-"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", (e) => reject(e));
    proc.on("close", (code) => {
      if (code === 0 && out.trim()) resolve(out.trim());
      else reject(new Error(err.slice(-200) || `pdftotext exit ${code}`));
    });
    proc.stdin.end(data);
  });
}

export async function extractPdfPath(pdfPath: string): Promise<string> {
  const raw = await readFile(pdfPath);
  return extractPdfBuffer(raw, pdfPath);
}
