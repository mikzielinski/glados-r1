import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { logger } from "./logger.js";

const log = logger("local-config");

export interface OkoLocalConfig {
  n8nBaseUrl?: string;
  n8nAuthHeader?: string;
  serperApiKey?: string;
  webSearchEnabled?: boolean;
}

const CONFIG_PATH = resolve(process.cwd(), ".oko-local.json");

export async function loadLocalConfigFile(): Promise<OkoLocalConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as OkoLocalConfig;
  } catch {
    return {};
  }
}

export async function saveLocalConfigFile(patch: Partial<OkoLocalConfig>): Promise<OkoLocalConfig> {
  const current = await loadLocalConfigFile();
  const next: OkoLocalConfig = { ...current, ...patch };
  await writeFile(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  log.info("saved .oko-local.json");
  return next;
}

export function localConfigPath(): string {
  return CONFIG_PATH;
}
