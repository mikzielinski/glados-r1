import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { assertLocalOllamaUrl } from "./slm-brain.js";
import type { OkoLocalConfig } from "./local-config.js";

function req(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var ${name} (copy .env.example to .env)`);
  }
  return v.trim();
}

function opt(name: string, fallback = ""): string {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : fallback;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export interface Config {
  cursorApiKey: string;
  cursorModel: string;
  repoPath: string;
  brainMode: "cursor" | "echo" | "hybrid" | "slm";
  ollamaBaseUrl: string;
  ollamaModel: string;
  slmTimeoutMs: number;
  cloudTurnTimeoutMs: number;
  cloudProgressIntervalMs: number;
  slmMaxTokens: number;
  slmHistoryTurns: number;
  host: string;
  port: number;
  whisperBin: string;
  whisperModel: string;
  whisperLang: string;
  whisperPrompt: string;
  whisperThreads: number;
  whisperNoSpeechThold: number;
  piperBin: string;
  piperModel: string;
  piperConfig: string;
  piperModelPl: string;
  piperConfigPl: string;
  /** Male PL Piper for HAL/TARS (defaults to pl_PL-darkman-medium next to gosia). */
  piperModelPlMale: string;
  piperConfigPlMale: string;
  piperSampleRate: number;
  piperLengthScale: number;
  ttsMode: "auto" | "fish" | "glados-net" | "piper" | "say" | "mock";
  ttsGladosFx: boolean;
  ttsGladosFxPreset: string;
  ttsFallback: string;
  fishApiKey: string;
  fishVoiceId: string;
  fishVoiceIdHal: string;
  fishVoiceIdTars: string;
  fishModel: string;
  gladosNetUrl: string;
  sayVoicePl: string;
  inputSampleRate: number;
  logLevel: string;
  skillsFile: string;
  standardsDir: string;
  standardsMaxChars: number;
  memoryDir: string;
  memoryMaxChars: number;
  memoryMaxEntryChars: number;
  memoryMaxEntries: number;
  memoryMaxUploadBytes: number;
  templateDir: string;
  templateMaxChars: number;
  templateMaxEntryChars: number;
  templateMaxEntries: number;
  n8nBaseUrl: string;
  n8nAuthHeader: string;
  serperApiKey: string;
  webSearchEnabled: boolean;
  integrationsFile: string;
  setupBaseUrl: string;
  setupGithubClientId: string;
  setupGithubClientSecret: string;
}

export function loadConfig(): Config {
  const brainModeRaw = opt("BRAIN_MODE", "slm");
  const brainMode =
    brainModeRaw === "echo" ? "echo" :
    brainModeRaw === "cursor" ? "cursor" :
    brainModeRaw === "hybrid" ? "hybrid" :
    "slm";
  const needsCursor = brainMode === "cursor" || brainMode === "hybrid";
  const apiKey = needsCursor ? req("CURSOR_API_KEY") : opt("CURSOR_API_KEY");
  const repoPath = needsCursor ? req("REPO_PATH") : opt("REPO_PATH", process.cwd());
  const local = loadLocalOverrides();
  return {
    cursorApiKey: apiKey,
    cursorModel: opt("CURSOR_MODEL", "composer-2.5"),
    repoPath,
    brainMode,
    ollamaBaseUrl: validateLocalOllamaUrl(opt("OLLAMA_BASE_URL", "http://127.0.0.1:11434")),
    ollamaModel: opt("OLLAMA_MODEL", "llama3.2:1b"),
    slmTimeoutMs: num("SLM_TIMEOUT_MS", 20_000),
    cloudTurnTimeoutMs: num("CLOUD_TURN_TIMEOUT_MS", 600_000),
    cloudProgressIntervalMs: num("CLOUD_PROGRESS_INTERVAL_MS", 45_000),
    slmMaxTokens: num("SLM_MAX_TOKENS", 150),
    slmHistoryTurns: num("SLM_HISTORY_TURNS", 4),
    host: opt("HOST", "0.0.0.0"),
    port: num("PORT", 8787),
    whisperBin: opt("WHISPER_BIN"),
    whisperModel: opt("WHISPER_MODEL"),
    whisperLang: opt("WHISPER_LANG", "auto"),
    whisperPrompt: opt("WHISPER_PROMPT"),
    whisperThreads: num("WHISPER_THREADS", 4),
    whisperNoSpeechThold: num("WHISPER_NO_SPEECH_THOLD", 0.45),
    piperBin: opt("PIPER_BIN", "python3"),
    piperModel: opt("PIPER_MODEL"),
    piperConfig: opt("PIPER_CONFIG"),
    piperModelPl: opt("PIPER_MODEL_PL"),
    piperConfigPl: opt("PIPER_CONFIG_PL"),
    ...resolveMalePlPiper(opt("PIPER_MODEL_PL_MALE"), opt("PIPER_CONFIG_PL_MALE"), opt("PIPER_MODEL_PL")),
    piperSampleRate: num("PIPER_SAMPLE_RATE", 22050),
    piperLengthScale: num("PIPER_LENGTH_SCALE", 1.0),
    ttsMode: parseTtsMode(opt("TTS_MODE", "auto")),
    ttsGladosFx: opt("TTS_GLADOS_FX", "false") !== "false",
    ttsGladosFxPreset: opt("TTS_GLADOS_FX_PRESET", "ingame"),
    ttsFallback: opt("TTS_FALLBACK"),
    fishApiKey: opt("FISH_API_KEY"),
    fishVoiceId: opt("FISH_VOICE_ID", "6fc91ffb3fe9444bb210f6d29f55d56d"),
    fishVoiceIdHal: opt("FISH_VOICE_ID_HAL", "06d2f87a335342f098ffd6b127a682fe"),
    fishVoiceIdTars: opt("FISH_VOICE_ID_TARS", "6a57e35f5c8244dbb5d012a3c434ec16"),
    fishModel: opt("FISH_MODEL", "s2-pro"),
    gladosNetUrl: opt("GLADOS_NET_URL", "https://glados.c-net.org/generate"),
    sayVoicePl: opt("SAY_VOICE_PL", "Zosia"),
    inputSampleRate: num("INPUT_SAMPLE_RATE", 16000),
    logLevel: opt("LOG_LEVEL", "info"),
    skillsFile: opt("SKILLS_FILE", "skills/skills.json"),
    standardsDir: opt("STANDARDS_DIR", resolve(process.cwd(), "../standards")),
    standardsMaxChars: num("STANDARDS_MAX_CHARS", 14_000),
    memoryDir: opt("MEMORY_DIR", resolve(process.cwd(), "data/memory")),
    memoryMaxChars: num("MEMORY_MAX_CHARS", 8000),
    memoryMaxEntryChars: num("MEMORY_MAX_ENTRY_CHARS", 12_000),
    memoryMaxEntries: num("MEMORY_MAX_ENTRIES", 200),
    memoryMaxUploadBytes: num("MEMORY_MAX_UPLOAD_BYTES", 4 * 1024 * 1024),
    templateDir: opt("TEMPLATE_DIR", resolve(process.cwd(), "data/templates")),
    templateMaxChars: num("TEMPLATE_MAX_CHARS", 10_000),
    templateMaxEntryChars: num("TEMPLATE_MAX_ENTRY_CHARS", 16_000),
    templateMaxEntries: num("TEMPLATE_MAX_ENTRIES", 100),
    n8nBaseUrl: local.n8nBaseUrl || opt("N8N_BASE_URL"),
    n8nAuthHeader: local.n8nAuthHeader || opt("N8N_AUTH_HEADER"),
    serperApiKey: local.serperApiKey || opt("SERPER_API_KEY"),
    webSearchEnabled: local.webSearchEnabled ?? opt("WEB_SEARCH_ENABLED", "true") !== "false",
    integrationsFile: opt("INTEGRATIONS_FILE", ".integrations.json"),
    setupBaseUrl: opt("SETUP_BASE_URL", `http://127.0.0.1:${num("PORT", 8787)}`),
    setupGithubClientId: opt("SETUP_GITHUB_CLIENT_ID"),
    setupGithubClientSecret: opt("SETUP_GITHUB_CLIENT_SECRET"),
  };
}

function loadLocalOverrides(): OkoLocalConfig {
  const path = resolve(process.cwd(), ".oko-local.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as OkoLocalConfig;
  } catch {
    return {};
  }
}

function parseTtsMode(raw: string): Config["ttsMode"] {
  switch (raw) {
    case "fish":
    case "glados-net":
    case "piper":
    case "say":
    case "mock":
      return raw;
    default:
      return "auto";
  }
}

function resolveMalePlPiper(
  explicitModel: string,
  explicitConfig: string,
  femaleModel: string,
): Pick<Config, "piperModelPlMale" | "piperConfigPlMale"> {
  const model = explicitModel || inferMalePlPiper(femaleModel);
  const config = explicitConfig || (model ? model.replace(/\.onnx$/, ".onnx.json") : "");
  return { piperModelPlMale: model, piperConfigPlMale: config };
}

function inferMalePlPiper(femaleModel: string): string {
  if (!femaleModel) return "";
  const dir = dirname(femaleModel);
  const candidates = [
    join(dir, "pl_PL-darkman-medium.onnx"),
    femaleModel.replace(/gosia/i, "darkman"),
  ];
  for (const path of candidates) {
    if (path !== femaleModel && existsSync(path)) return path;
  }
  return "";
}

function validateLocalOllamaUrl(url: string): string {
  assertLocalOllamaUrl(url);
  return url.replace(/\/$/, "");
}
