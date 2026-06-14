import type { GitHubIntegration, IntegrationsStore, UiPathIntegration } from "./integrations-store.js";
import { logger } from "./logger.js";

const log = logger("integrations");

export async function handleGitHubSkill(
  store: IntegrationsStore,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; text: string }> {
  const gh = store.get().github;
  if (!gh?.accessToken) {
    return { ok: false, text: "GitHub nie jest połączony. Otwórz kreator: /setup" };
  }

  const action = String(args.action ?? "");
  const owner = String(args.owner ?? "");
  const repo = String(args.repo ?? "");

  try {
    switch (action) {
      case "list_prs": {
        const path = owner && repo ? `/repos/${owner}/${repo}/pulls?state=open&per_page=10` : "/user/issues?filter=all&per_page=10";
        const data = await ghFetch(gh, path);
        const items = Array.isArray(data) ? data : [];
        const lines = items.slice(0, 10).map((pr: Record<string, unknown>) => {
          const num = pr.number ?? "?";
          const title = pr.title ?? "(bez tytułu)";
          const user = (pr.user as Record<string, unknown> | undefined)?.login ?? "?";
          return `#${num} ${title} (@${user})`;
        });
        return { ok: true, text: lines.length ? lines.join("\n") : "Brak otwartych PR." };
      }
      case "get_pr": {
        if (!owner || !repo || args.number == null) {
          return { ok: false, text: "Wymagane: owner, repo, number" };
        }
        const pr = await ghFetch(gh, `/repos/${owner}/${repo}/pulls/${args.number}`);
        return {
          ok: true,
          text: `PR #${pr.number}: ${pr.title}\nStan: ${pr.state}\nAutor: ${pr.user?.login}\n${pr.body?.slice(0, 800) ?? ""}`,
        };
      }
      case "list_issues": {
        const path = owner && repo
          ? `/repos/${owner}/${repo}/issues?state=open&per_page=10`
          : "/issues?filter=assigned&state=open&per_page=10";
        const data = await ghFetch(gh, path);
        const lines = (data as Record<string, unknown>[]).slice(0, 10).map((i) =>
          `#${i.number} ${i.title} (${i.state})`,
        );
        return { ok: true, text: lines.length ? lines.join("\n") : "Brak issue." };
      }
      case "get_file": {
        if (!owner || !repo || !args.path) return { ok: false, text: "Wymagane: owner, repo, path" };
        const ref = args.ref ? `?ref=${encodeURIComponent(String(args.ref))}` : "";
        const file = await ghFetch(gh, `/repos/${owner}/${repo}/contents/${String(args.path)}${ref}`);
        if (file.content && file.encoding === "base64") {
          const text = Buffer.from(String(file.content), "base64").toString("utf8").slice(0, 4000);
          return { ok: true, text: `Plik ${args.path}:\n${text}` };
        }
        return { ok: true, text: JSON.stringify(file).slice(0, 2000) };
      }
      case "create_issue": {
        if (!owner || !repo || !args.title) return { ok: false, text: "Wymagane: owner, repo, title" };
        const issue = await ghFetch(gh, `/repos/${owner}/${repo}/issues`, {
          method: "POST",
          body: JSON.stringify({ title: args.title, body: args.body ?? "" }),
        });
        return { ok: true, text: `Utworzono issue #${issue.number}: ${issue.html_url}` };
      }
      default:
        return { ok: false, text: `Nieznana akcja GitHub: ${action}` };
    }
  } catch (err) {
    log.error("github skill error", err);
    return { ok: false, text: `GitHub błąd: ${(err as Error).message}` };
  }
}

export async function handleUiPathSkill(
  store: IntegrationsStore,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; text: string }> {
  let uipath = store.get().uipath;
  if (!uipath?.accessToken) {
    return { ok: false, text: "UiPath nie jest połączony. Otwórz kreator: /setup" };
  }

  uipath = await ensureUiPathToken(store, uipath);
  const action = String(args.action ?? "");
  const base = orchestratorBase(uipath);

  try {
    switch (action) {
      case "list_queues": {
        const data = await uipathFetch(uipath, `${base}/odata/Queues?$top=10`);
        const items = (data.value as Record<string, unknown>[] | undefined) ?? [];
        const lines = items.map((q) => `${q.Name} (id=${q.Id})`);
        return { ok: true, text: lines.length ? lines.join("\n") : "Brak kolejek." };
      }
      case "add_queue_item": {
        if (!args.queue_name) return { ok: false, text: "Wymagane: queue_name" };
        const queues = await uipathFetch(uipath, `${base}/odata/Queues?$filter=Name eq '${escapeOData(String(args.queue_name))}'`);
        const queue = (queues.value as Record<string, unknown>[] | undefined)?.[0];
        if (!queue) return { ok: false, text: `Nie znaleziono kolejki: ${args.queue_name}` };
        await uipathFetch(uipath, `${base}/odata/Queues/UiPathODataSvc.AddQueueItem`, {
          method: "POST",
          body: JSON.stringify({
            itemData: {
              Name: String(args.queue_name),
              Priority: "Normal",
              SpecificContent: args.item_data ?? {},
            },
          }),
        });
        return { ok: true, text: `Dodano element do kolejki ${args.queue_name}.` };
      }
      case "list_releases": {
        const data = await uipathFetch(uipath, `${base}/odata/Releases?$top=10`);
        const items = (data.value as Record<string, unknown>[] | undefined) ?? [];
        const lines = items.map((r) => `${r.Name} (key=${r.Key})`);
        return { ok: true, text: lines.length ? lines.join("\n") : "Brak release." };
      }
      case "start_job": {
        if (!args.release_key) return { ok: false, text: "Wymagane: release_key" };
        const job = await uipathFetch(uipath, `${base}/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs`, {
          method: "POST",
          body: JSON.stringify({
            startInfo: {
              ReleaseKey: String(args.release_key),
              Strategy: "ModernJobsCount",
              JobsCount: 1,
            },
          }),
        });
        return { ok: true, text: `Job uruchomiony: ${JSON.stringify(job).slice(0, 500)}` };
      }
      case "job_status": {
        if (args.job_id == null) return { ok: false, text: "Wymagane: job_id" };
        const job = await uipathFetch(uipath, `${base}/odata/Jobs(${args.job_id})`);
        return { ok: true, text: `Job ${job.Id}: ${job.State} — ${job.Info ?? ""}` };
      }
      default:
        return { ok: false, text: `Nieznana akcja UiPath: ${action}` };
    }
  } catch (err) {
    log.error("uipath skill error", err);
    return { ok: false, text: `UiPath błąd: ${(err as Error).message}` };
  }
}

async function ghFetch(gh: GitHubIntegration, path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${gh.accessToken}`,
      "x-github-api-version": "2022-11-28",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

function orchestratorBase(u: UiPathIntegration): string {
  const account = u.accountUrl.replace(/\/$/, "");
  return `${account}/${u.organization}/${u.tenant}/orchestrator_`;
}

async function uipathFetch(u: UiPathIntegration, url: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${u.accessToken}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function ensureUiPathToken(store: IntegrationsStore, u: UiPathIntegration): Promise<UiPathIntegration> {
  if (!u.refreshToken || !u.expiresAt || Date.now() < u.expiresAt - 60_000) return u;

  const tokenUrl = `${u.accountUrl.replace(/\/$/, "")}/identity_/connect/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: u.clientId,
    client_secret: u.clientSecret,
    refresh_token: u.refreshToken,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`UiPath refresh failed: ${text.slice(0, 300)}`);
  const data = JSON.parse(text) as { access_token: string; refresh_token?: string; expires_in?: number };
  const updated: UiPathIntegration = {
    ...u,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? u.refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  await store.patch({ uipath: updated });
  return updated;
}

function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

export async function testGitHubConnection(gh: GitHubIntegration): Promise<{ ok: boolean; login: string; message: string }> {
  try {
    const user = await ghFetch(gh, "/user");
    return { ok: true, login: String(user.login ?? ""), message: `Połączono jako @${user.login}` };
  } catch (err) {
    return { ok: false, login: "", message: (err as Error).message };
  }
}

export async function testUiPathConnection(u: UiPathIntegration): Promise<{ ok: boolean; message: string }> {
  try {
    const base = orchestratorBase(u);
    await uipathFetch(u, `${base}/odata/Queues?$top=1`);
    return { ok: true, message: `Orchestrator OK (${u.organization}/${u.tenant})` };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
