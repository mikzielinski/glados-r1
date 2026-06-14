import { createReadStream, existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Config } from "./config.js";
import type { IntegrationsStore } from "./integrations-store.js";
import {
  handleGitHubSkill,
  handleUiPathSkill,
  testGitHubConnection,
  testUiPathConnection,
} from "./integration-handlers.js";
import { logger } from "./logger.js";

const log = logger("setup");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

interface OAuthState {
  provider: "github" | "uipath";
  createdAt: number;
  returnTo: string;
  github?: { clientId: string; clientSecret: string };
  uipath?: {
    accountUrl: string;
    organization: string;
    tenant: string;
    clientId: string;
    clientSecret: string;
  };
}

const oauthStates = new Map<string, OAuthState>();

export class SetupRoutes {
  private readonly publicDir: string;
  private readonly baseUrl: string;

  constructor(
    private readonly cfg: Config,
    private readonly store: IntegrationsStore,
  ) {
    this.publicDir = resolve(process.cwd(), "public/setup");
    this.baseUrl = cfg.setupBaseUrl.replace(/\/$/, "");
  }

  async handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
    const path = url.pathname;

    if (path === "/setup" || path === "/setup/") {
      return this.serveFile(res, join(this.publicDir, "index.html"));
    }
    if (path.startsWith("/setup/")) {
      const asset = join(this.publicDir, path.slice("/setup/".length));
      if (asset.startsWith(this.publicDir) && existsSync(asset)) {
        return this.serveFile(res, asset);
      }
    }

    if (path === "/api/setup/status") {
      await this.store.load();
      return json(res, 200, { ok: true, ...this.store.status(), setupUrl: `${this.baseUrl}/setup` });
    }

    if (path === "/api/setup/github/config" && req.method === "POST") {
      return this.saveGitHubConfig(req, res);
    }
    if (path === "/api/setup/github/pat" && req.method === "POST") {
      return this.saveGitHubPat(req, res);
    }
    if (path === "/api/setup/github/start") {
      return this.startGitHubOAuth(url, res);
    }
    if (path === "/api/setup/github/callback") {
      return this.githubCallback(url, res);
    }
    if (path === "/api/setup/github/test" && req.method === "POST") {
      return this.testGitHub(res);
    }

    if (path === "/api/setup/uipath/config" && req.method === "POST") {
      return this.saveUiPathConfig(req, res);
    }
    if (path === "/api/setup/uipath/start") {
      return this.startUiPathOAuth(url, res);
    }
    if (path === "/api/setup/uipath/callback") {
      return this.uipathCallback(url, res);
    }
    if (path === "/api/setup/uipath/test" && req.method === "POST") {
      return this.testUiPath(res);
    }

    if (path === "/api/setup/finish" && req.method === "POST") {
      return this.finishSetup(res);
    }

    if (path === "/api/integrations/github" && req.method === "POST") {
      return this.runSkill(req, res, "github");
    }
    if (path === "/api/integrations/uipath" && req.method === "POST") {
      return this.runSkill(req, res, "uipath");
    }

    return false;
  }

  private async runSkill(req: IncomingMessage, res: ServerResponse, which: "github" | "uipath"): Promise<boolean> {
    const body = await readJson(req);
    await this.store.load();
    const result = which === "github"
      ? await handleGitHubSkill(this.store, body)
      : await handleUiPathSkill(this.store, body);
    res.writeHead(result.ok ? 200 : 502, { "content-type": "text/plain; charset=utf-8" });
    res.end(result.text);
    return true;
  }

  private async saveGitHubConfig(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const body = await readJson(req);
    const clientId = String(body.clientId ?? "").trim();
    const clientSecret = String(body.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      return json(res, 400, { ok: false, message: "Podaj Client ID i Client Secret OAuth App z GitHub." });
    }
    await this.store.load();
    await this.store.patch({
      github: {
        type: "oauth",
        accessToken: this.store.get().github?.accessToken ?? "",
        clientId,
        clientSecret,
        login: this.store.get().github?.login,
      },
    });
    return json(res, 200, { ok: true, message: "Zapisano dane OAuth GitHub." });
  }

  private async saveGitHubPat(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const body = await readJson(req);
    const token = String(body.token ?? "").trim();
    if (!token) return json(res, 400, { ok: false, message: "Podaj Personal Access Token." });

    const gh = { type: "pat" as const, accessToken: token };
    const test = await testGitHubConnection(gh);
    if (!test.ok) return json(res, 400, { ok: false, message: test.message });

    await this.store.patch({ github: { ...gh, login: test.login } });
    return json(res, 200, { ok: true, login: test.login, message: test.message });
  }

  private async startGitHubOAuth(url: URL, res: ServerResponse): Promise<boolean> {
    await this.store.load();
    const state = randomBytes(16).toString("hex");
    const gh = this.store.get().github;
    const clientId = url.searchParams.get("clientId")?.trim() || gh?.clientId || this.cfg.setupGithubClientId;
    const clientSecret = gh?.clientSecret || this.cfg.setupGithubClientSecret;
    if (!clientId || !clientSecret) {
      return json(res, 400, {
        ok: false,
        message: "Najpierw zapisz Client ID i Secret OAuth App (Settings → Developer settings → OAuth Apps).",
      });
    }

    oauthStates.set(state, {
      provider: "github",
      createdAt: Date.now(),
      returnTo: `${this.baseUrl}/setup#github`,
      github: { clientId, clientSecret },
    });

    const redirectUri = `${this.baseUrl}/api/setup/github/callback`;
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "repo read:org read:user");
    authUrl.searchParams.set("state", state);
    redirect(res, authUrl.toString());
    return true;
  }

  private async githubCallback(url: URL, res: ServerResponse): Promise<boolean> {
    const err = url.searchParams.get("error");
    if (err) return redirect(res, `${this.baseUrl}/setup?error=${encodeURIComponent(err)}#github`);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return json(res, 400, { ok: false, message: "Brak code/state z GitHub." });

    const pending = oauthStates.get(state);
    oauthStates.delete(state);
    if (!pending?.github || pending.provider !== "github") {
      return json(res, 400, { ok: false, message: "Sesja OAuth wygasła — spróbuj ponownie." });
    }

    const redirectUri = `${this.baseUrl}/api/setup/github/callback`;
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        client_id: pending.github.clientId,
        client_secret: pending.github.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      return redirect(res, `${this.baseUrl}/setup?error=${encodeURIComponent(tokenData.error_description ?? tokenData.error ?? "token")}#github`);
    }

    const gh = {
      type: "oauth" as const,
      accessToken: tokenData.access_token,
      clientId: pending.github.clientId,
      clientSecret: pending.github.clientSecret,
    };
    const test = await testGitHubConnection(gh);
    await this.store.patch({ github: { ...gh, login: test.login } });
    redirect(res, `${this.baseUrl}/setup?github=connected&login=${encodeURIComponent(test.login)}#github`);
    return true;
  }

  private async testGitHub(res: ServerResponse): Promise<boolean> {
    await this.store.load();
    const gh = this.store.get().github;
    if (!gh?.accessToken) return json(res, 400, { ok: false, message: "GitHub nie połączony." });
    const test = await testGitHubConnection(gh);
    return json(res, test.ok ? 200 : 502, test);
  }

  private async saveUiPathConfig(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const body = await readJson(req);
    const accountUrl = String(body.accountUrl ?? "https://cloud.uipath.com").trim().replace(/\/$/, "");
    const organization = String(body.organization ?? "").trim();
    const tenant = String(body.tenant ?? "DefaultTenant").trim();
    const clientId = String(body.clientId ?? "").trim();
    const clientSecret = String(body.clientSecret ?? "").trim();

    if (!organization || !clientId || !clientSecret) {
      return json(res, 400, { ok: false, message: "Podaj organization, Client ID i Client Secret z UiPath Automation Cloud." });
    }

    await this.store.load();
    const prev = this.store.get().uipath;
    await this.store.patch({
      uipath: {
        type: "oauth",
        accessToken: prev?.accessToken ?? "",
        refreshToken: prev?.refreshToken,
        expiresAt: prev?.expiresAt,
        accountUrl,
        organization,
        tenant,
        clientId,
        clientSecret,
      },
    });
    return json(res, 200, { ok: true, message: "Zapisano konfigurację UiPath." });
  }

  private async startUiPathOAuth(_url: URL, res: ServerResponse): Promise<boolean> {
    await this.store.load();
    const u = this.store.get().uipath;
    if (!u?.clientId || !u.clientSecret || !u.organization) {
      return json(res, 400, { ok: false, message: "Najpierw zapisz dane UiPath (krok 3)." });
    }

    const state = randomBytes(16).toString("hex");
    oauthStates.set(state, {
      provider: "uipath",
      createdAt: Date.now(),
      returnTo: `${this.baseUrl}/setup#uipath`,
      uipath: {
        accountUrl: u.accountUrl,
        organization: u.organization,
        tenant: u.tenant,
        clientId: u.clientId,
        clientSecret: u.clientSecret,
      },
    });

    const redirectUri = `${this.baseUrl}/api/setup/uipath/callback`;
    const authUrl = new URL(`${u.accountUrl.replace(/\/$/, "")}/identity_/connect/authorize`);
    authUrl.searchParams.set("client_id", u.clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "OR.Administration OR.Jobs OR.Queues OR.Folders OR.Execution");
    authUrl.searchParams.set("state", state);
    redirect(res, authUrl.toString());
    return true;
  }

  private async uipathCallback(url: URL, res: ServerResponse): Promise<boolean> {
    const err = url.searchParams.get("error");
    if (err) return redirect(res, `${this.baseUrl}/setup?error=${encodeURIComponent(err)}#uipath`);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return json(res, 400, { ok: false, message: "Brak code/state z UiPath." });

    const pending = oauthStates.get(state);
    oauthStates.delete(state);
    if (!pending?.uipath || pending.provider !== "uipath") {
      return json(res, 400, { ok: false, message: "Sesja OAuth wygasła — spróbuj ponownie." });
    }

    const redirectUri = `${this.baseUrl}/api/setup/uipath/callback`;
    const tokenUrl = `${pending.uipath.accountUrl.replace(/\/$/, "")}/identity_/connect/token`;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: pending.uipath.clientId,
      client_secret: pending.uipath.clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await tokenRes.text();
    if (!tokenRes.ok) {
      return redirect(res, `${this.baseUrl}/setup?error=${encodeURIComponent(text.slice(0, 120))}#uipath`);
    }
    const data = JSON.parse(text) as { access_token: string; refresh_token?: string; expires_in?: number };

    const uipath = {
      type: "oauth" as const,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      accountUrl: pending.uipath.accountUrl,
      organization: pending.uipath.organization,
      tenant: pending.uipath.tenant,
      clientId: pending.uipath.clientId,
      clientSecret: pending.uipath.clientSecret,
    };
    await this.store.patch({ uipath });
    redirect(res, `${this.baseUrl}/setup?uipath=connected#summary`);
    return true;
  }

  private async testUiPath(res: ServerResponse): Promise<boolean> {
    await this.store.load();
    const u = this.store.get().uipath;
    if (!u?.accessToken) return json(res, 400, { ok: false, message: "UiPath nie połączony." });
    const test = await testUiPathConnection(u);
    return json(res, test.ok ? 200 : 502, test);
  }

  private async finishSetup(res: ServerResponse): Promise<boolean> {
    await this.store.load();
    const status = this.store.status();
    await patchSkillsWebhooks(this.cfg, this.baseUrl);
    return json(res, 200, {
      ok: true,
      message: "Skille wskazują na lokalne integracje (bez n8n).",
      status,
    });
  }

  private serveFile(res: ServerResponse, filePath: string): boolean {
    const ext = extname(filePath);
    res.writeHead(200, { "content-type": MIME[ext] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(res);
    return true;
  }
}

async function patchSkillsWebhooks(cfg: Config, baseUrl: string): Promise<void> {
  const skillsPath = resolve(process.cwd(), cfg.skillsFile);
  let raw: string;
  try {
    raw = await readFile(skillsPath, "utf8");
  } catch {
    log.warn(`skills file not found: ${skillsPath}`);
    return;
  }
  const parsed = JSON.parse(raw) as { skills?: Array<Record<string, unknown>> };
  const list = parsed.skills ?? (Array.isArray(parsed) ? parsed as Array<Record<string, unknown>> : []);
  const base = baseUrl.replace(/\/$/, "");
  for (const skill of list) {
    if (skill.name === "github_api") skill.webhook = `${base}/api/integrations/github`;
    if (skill.name === "uipath_orchestrator") skill.webhook = `${base}/api/integrations/uipath`;
  }
  const out = parsed.skills ? parsed : { skills: list };
  await writeFile(skillsPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  log.info("patched skills.json webhooks to local integration endpoints");
}

function json(res: ServerResponse, code: number, body: unknown): boolean {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
  return true;
}

function redirect(res: ServerResponse, location: string): boolean {
  res.writeHead(302, { location });
  res.end();
  return true;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text) as Record<string, unknown>;
}

/** Drop OAuth states older than 15 minutes. */
export function cleanupOAuthStates(): void {
  const cutoff = Date.now() - 15 * 60_000;
  for (const [k, v] of oauthStates) {
    if (v.createdAt < cutoff) oauthStates.delete(k);
  }
}
