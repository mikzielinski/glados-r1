import { readFile, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { SDKCustomTool, SDKJsonValue } from "@cursor/sdk";
import type { Config } from "./config.js";
import { logger } from "./logger.js";

const log = logger("skills");

/**
 * A GLaDOS "skill" is an n8n workflow exposed to the agent as a callable tool.
 * Define skills in skills.json — no backend code needed to add one.
 */
export interface SkillDef {
  /** Tool name the agent sees. Must match [a-zA-Z0-9_-]+. */
  name: string;
  /** What the skill does — the agent uses this to decide when to call it. */
  description: string;
  /** Full URL, or a path/relative ref resolved against N8N_BASE_URL. */
  webhook: string;
  method?: "POST" | "GET";
  /** JSON Schema for the arguments the agent should provide. */
  inputSchema?: Record<string, SDKJsonValue>;
  /** Extra headers for this skill (merged over the global N8N auth header). */
  headers?: Record<string, string>;
  timeoutMs?: number;
}

const NAME_RE = /^[a-zA-Z0-9_-]+$/;

function validate(skill: unknown): skill is SkillDef {
  if (!skill || typeof skill !== "object") return false;
  const s = skill as Record<string, unknown>;
  if (typeof s.name !== "string" || !NAME_RE.test(s.name)) return false;
  if (typeof s.description !== "string" || s.description.trim() === "") return false;
  if (typeof s.webhook !== "string" || s.webhook.trim() === "") return false;
  return true;
}

/**
 * Loads skills from disk, reloading automatically when the file changes, and
 * exposes them as Cursor SDK custom tools that POST to the n8n webhooks.
 */
export class SkillRegistry {
  private readonly path: string;
  private lastMtimeMs = -1;
  private tools: Record<string, SDKCustomTool> = {};
  private names: string[] = [];

  constructor(private readonly cfg: Config) {
    this.path = isAbsolute(cfg.skillsFile) ? cfg.skillsFile : resolve(process.cwd(), cfg.skillsFile);
  }

  /** Skill names currently registered (for status/persona hints). */
  getNames(): string[] {
    return this.names;
  }

  /** Custom tools to hand to the agent, refreshing from disk if changed. */
  async getCustomTools(): Promise<Record<string, SDKCustomTool>> {
    await this.refreshIfChanged();
    return this.tools;
  }

  private async refreshIfChanged(): Promise<void> {
    let mtimeMs: number;
    try {
      mtimeMs = (await stat(this.path)).mtimeMs;
    } catch {
      if (this.lastMtimeMs !== -1) log.warn(`skills file gone: ${this.path}`);
      this.lastMtimeMs = -1;
      this.tools = {};
      this.names = [];
      return;
    }
    if (mtimeMs === this.lastMtimeMs) return;
    this.lastMtimeMs = mtimeMs;
    await this.load();
  }

  private async load(): Promise<void> {
    let raw: string;
    try {
      raw = await readFile(this.path, "utf8");
    } catch (err) {
      log.warn(`could not read skills file ${this.path}`, err);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      log.error(`skills.json is not valid JSON — keeping previous skills`, err);
      return;
    }

    const list = Array.isArray(parsed) ? parsed : (parsed as { skills?: unknown[] })?.skills;
    if (!Array.isArray(list)) {
      log.error(`skills file must be an array or { "skills": [...] }`);
      return;
    }

    const tools: Record<string, SDKCustomTool> = {};
    const names: string[] = [];
    for (const item of list) {
      if (!validate(item)) {
        log.warn(`skipping invalid skill entry`, item);
        continue;
      }
      tools[item.name] = this.toTool(item);
      names.push(item.name);
    }
    this.tools = tools;
    this.names = names;
    log.info(`loaded ${names.length} skill(s): ${names.join(", ") || "(none)"}`);
  }

  private toTool(skill: SkillDef): SDKCustomTool {
    const cfg = this.cfg;
    return {
      description: skill.description,
      inputSchema: skill.inputSchema,
      execute: async (args) => {
        const url = this.resolveUrl(skill.webhook);
        if (!url) {
          return { content: [{ type: "text", text: `Skill "${skill.name}" has no resolvable URL (set N8N_BASE_URL or use a full webhook URL).` }], isError: true };
        }
        const method = skill.method ?? "POST";
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (cfg.n8nAuthHeader) {
          const idx = cfg.n8nAuthHeader.indexOf(":");
          if (idx > 0) headers[cfg.n8nAuthHeader.slice(0, idx).trim()] = cfg.n8nAuthHeader.slice(idx + 1).trim();
        }
        Object.assign(headers, skill.headers ?? {});

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), skill.timeoutMs ?? 15000);
        try {
          let target = url;
          const init: RequestInit = { method, headers, signal: controller.signal };
          if (method === "GET") {
            const qs = new URLSearchParams();
            for (const [k, v] of Object.entries(args)) qs.set(k, String(v));
            const sep = url.includes("?") ? "&" : "?";
            target = qs.toString() ? `${url}${sep}${qs}` : url;
          } else {
            init.body = JSON.stringify(args ?? {});
          }
          log.info(`skill ${skill.name} -> ${method} ${target}`);
          const res = await fetch(target, init);
          const text = await res.text();
          if (!res.ok) {
            return { content: [{ type: "text", text: `Skill "${skill.name}" failed: HTTP ${res.status} ${text.slice(0, 500)}` }], isError: true };
          }
          return text || `Skill "${skill.name}" completed.`;
        } catch (err) {
          const msg = (err as Error).name === "AbortError" ? "timed out" : (err as Error).message;
          return { content: [{ type: "text", text: `Skill "${skill.name}" error: ${msg}` }], isError: true };
        } finally {
          clearTimeout(timeout);
        }
      },
    };
  }

  private resolveUrl(webhook: string): string | null {
    if (/^https?:\/\//i.test(webhook)) return webhook;
    if (!this.cfg.n8nBaseUrl) return null;
    return `${this.cfg.n8nBaseUrl.replace(/\/$/, "")}/${webhook.replace(/^\//, "")}`;
  }
}
