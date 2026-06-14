import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { logger } from "./logger.js";

const log = logger("integrations");

export interface GitHubIntegration {
  type: "oauth" | "pat";
  accessToken: string;
  login?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface UiPathIntegration {
  type: "oauth";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountUrl: string;
  organization: string;
  tenant: string;
  clientId: string;
  clientSecret: string;
}

export interface IntegrationsFile {
  github?: GitHubIntegration;
  uipath?: UiPathIntegration;
  updatedAt?: string;
}

export class IntegrationsStore {
  private readonly path: string;
  private cache: IntegrationsFile = {};

  constructor(integrationsFile: string) {
    this.path = isAbsolute(integrationsFile)
      ? integrationsFile
      : resolve(process.cwd(), integrationsFile);
  }

  async load(): Promise<IntegrationsFile> {
    try {
      const raw = await readFile(this.path, "utf8");
      this.cache = JSON.parse(raw) as IntegrationsFile;
      return this.cache;
    } catch {
      this.cache = {};
      return this.cache;
    }
  }

  async save(data: IntegrationsFile): Promise<void> {
    this.cache = { ...data, updatedAt: new Date().toISOString() };
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, `${JSON.stringify(this.cache, null, 2)}\n`, "utf8");
    log.info(`saved integrations to ${this.path}`);
  }

  get(): IntegrationsFile {
    return this.cache;
  }

  async patch(partial: Partial<IntegrationsFile>): Promise<IntegrationsFile> {
    await this.load();
    this.cache = { ...this.cache, ...partial, updatedAt: new Date().toISOString() };
    await this.save(this.cache);
    return this.cache;
  }

  status() {
    const g = this.cache.github;
    const u = this.cache.uipath;
    return {
      github: {
        connected: Boolean(g?.accessToken),
        login: g?.login ?? null,
        type: g?.type ?? null,
      },
      uipath: {
        connected: Boolean(u?.accessToken),
        organization: u?.organization ?? null,
        tenant: u?.tenant ?? null,
        accountUrl: u?.accountUrl ?? null,
        expiresAt: u?.expiresAt ?? null,
      },
    };
  }
}
