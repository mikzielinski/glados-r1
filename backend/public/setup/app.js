/** OKO Admin Panel — single-page dashboard (PL / EN) */

function getPages() {
  return {
    dashboard: { title: t("pages.dashboard.title"), sub: t("pages.dashboard.sub") },
    integrations: { title: t("pages.integrations.title"), sub: t("pages.integrations.sub") },
    templates: { title: t("pages.templates.title"), sub: t("pages.templates.sub") },
    memory: { title: t("pages.memory.title"), sub: t("pages.memory.sub") },
    rag: { title: t("pages.rag.title"), sub: t("pages.rag.sub") },
    standards: { title: t("pages.standards.title"), sub: t("pages.standards.sub") },
    skills: { title: t("pages.skills.title"), sub: t("pages.skills.sub") },
    settings: { title: t("pages.settings.title"), sub: t("pages.settings.sub") },
  };
}

let statusData = {};
let templatesCache = [];
let memoryCache = [];
let currentPage = "dashboard";

function localeTag() {
  return getSetupLang() === "en" ? "en-GB" : "pl-PL";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function toast(msg, kind = "info") {
  const stack = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function inline(el, text, kind = "") {
  if (!el) return;
  el.textContent = text || "";
  el.className = `inline-status ${kind}`;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

function baseUrl() {
  return `${window.location.protocol}//${window.location.host}`;
}

function showPage(id) {
  currentPage = id;
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.dataset.page === id));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.page === id));
  const meta = getPages()[id] || getPages().dashboard;
  document.getElementById("page-title").textContent = meta.title;
  document.getElementById("page-sub").textContent = meta.sub;
  location.hash = id;
  document.getElementById("sidebar").classList.remove("open");
  loadPage(id);
}

function loadPage(id) {
  if (id === "dashboard") renderDashboard();
  if (id === "templates") refreshTemplates();
  if (id === "memory") refreshMemory();
  if (id === "rag") refreshRag();
  if (id === "standards") refreshStandards();
  if (id === "skills") refreshSkills();
  if (id === "settings") loadSettingsForm();
}

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});
document.querySelectorAll("[data-goto]").forEach((btn) => {
  btn.addEventListener("click", () => showPage(btn.dataset.goto));
});
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

document.querySelectorAll(".lang-toggle [data-lang]").forEach((btn) => {
  btn.addEventListener("click", () => setSetupLang(btn.dataset.lang));
});

window.onSetupLangChange = function onSetupLangChange() {
  const meta = getPages()[currentPage] || getPages().dashboard;
  document.getElementById("page-title").textContent = meta.title;
  document.getElementById("page-sub").textContent = meta.sub;
  loadPage(currentPage);
};

async function refreshStatus() {
  statusData = await api("/api/setup/status");
  updateBadges();
  renderDashboard();
  const sys = document.getElementById("sys-status");
  sys.dataset.boot = "1";
  sys.textContent = `Backend :${statusData.port || 8787} · ${statusData.brainMode || "?"}`;
}

function updateBadges() {
  const gh = statusData.github || {};
  const ui = statusData.uipath || {};
  const ghB = document.getElementById("gh-badge");
  const uiB = document.getElementById("ui-badge");
  if (ghB) {
    ghB.textContent = gh.connected ? `@${gh.login || "OK"}` : t("offline");
    ghB.className = `badge ${gh.connected ? "on" : "off"}`;
  }
  if (uiB) {
    uiB.textContent = ui.connected ? "OK" : t("offline");
    uiB.className = `badge ${ui.connected ? "on" : "off"}`;
  }
  if (gh.connected) inline(document.getElementById("gh-status"), `${t("dash.connectedAs")}${gh.login}`, "ok");
  if (ui.connected) inline(document.getElementById("ui-status"), `${ui.organization}/${ui.tenant}`, "ok");
}

function renderDashboard() {
  const gh = statusData.github || {};
  const ui = statusData.uipath || {};
  document.getElementById("dash-stats").innerHTML = `
    <div class="stat-card ${gh.connected ? "ok" : "warn"}">
      <div class="label">GitHub</div>
      <div class="value">${gh.connected ? "✓" : "—"}</div>
      <div class="sub">${gh.login ? `@${gh.login}` : t("notConnected")}</div>
    </div>
    <div class="stat-card ${ui.connected ? "ok" : "warn"}">
      <div class="label">UiPath</div>
      <div class="value">${ui.connected ? "✓" : "—"}</div>
      <div class="sub">${ui.organization || t("none")}</div>
    </div>
    <div class="stat-card">
      <div class="label">${t("dash.templates")}</div>
      <div class="value">${statusData.templatesCount ?? 0}</div>
      <div class="sub">${t("dash.documentation")}</div>
    </div>
    <div class="stat-card">
      <div class="label">${t("dash.standards")}</div>
      <div class="value">${statusData.standardsCount ?? 0}</div>
      <div class="sub">${t("dash.codePdf")}</div>
    </div>
    <div class="stat-card">
      <div class="label">${t("dash.memory")}</div>
      <div class="value">${statusData.memoryGlobalCount ?? 0}</div>
      <div class="sub">${t("dash.facts")}</div>
    </div>
    <div class="stat-card ${(statusData.rag || {}).ready ? "ok" : "warn"}">
      <div class="label">RAG</div>
      <div class="value">${ragStatusLabel(statusData.rag)}</div>
      <div class="sub">${statusData.rag?.chunkCount ?? 0} ${t("dash.chunks")}</div>
    </div>
    <div class="stat-card">
      <div class="label">${t("dash.skills")}</div>
      <div class="value">${(statusData.skills || []).length}</div>
      <div class="sub">${t("dash.active")}</div>
    </div>
  `;
  const serper = getSetupLang() === "en" ? (statusData.serperApiKeySet ? "yes" : "no") : (statusData.serperApiKeySet ? "tak" : "nie");
  document.getElementById("sys-meta").innerHTML = `
    <dt>${t("dash.brainMode")}</dt><dd>${escapeHtml(statusData.brainMode || "—")}</dd>
    <dt>${t("dash.repo")}</dt><dd>${escapeHtml(statusData.repoPath || "—")}</dd>
    <dt>${t("dash.internet")}</dt><dd>${statusData.webSearchEnabled ? t("dash.enabled") : t("dash.disabled")} · Serper ${serper}</dd>
    <dt>${t("dash.panelUrl")}</dt><dd>${escapeHtml(statusData.setupUrl || baseUrl() + "/setup")}</dd>
  `;
  document.getElementById("dash-skills").innerHTML = (statusData.skills || [])
    .map((s) => `<span class="tag">${escapeHtml(s)}</span>`)
    .join("") || `<span class="muted">${t("dash.noSkills")}</span>`;
}

function clearTemplateForm() {
  document.getElementById("tpl-id").value = "";
  document.getElementById("tpl-name").value = "";
  document.getElementById("tpl-desc").value = "";
  document.getElementById("tpl-content").value = "";
  document.getElementById("tpl-form-title").textContent = t("templates.newForm");
}

async function refreshTemplates() {
  const r = await api("/api/setup/templates");
  templatesCache = r.templates || [];
  const body = document.getElementById("templates-body");
  body.innerHTML = templatesCache.length
    ? templatesCache
        .map(
          (tpl) => `<tr data-id="${tpl.id}">
        <td><strong>${escapeHtml(tpl.name)}</strong></td>
        <td>${escapeHtml(tpl.description || "—")}</td>
        <td class="actions">
          <button type="button" class="btn ghost tpl-view">${t("view")}</button>
          <button type="button" class="btn ghost tpl-edit">${t("edit")}</button>
          <button type="button" class="btn ghost tpl-del">${t("delete")}</button>
        </td></tr>`,
        )
        .join("")
    : `<tr><td colspan="3" class="muted">${t("templates.empty")}</td></tr>`;

  body.querySelectorAll(".tpl-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tpl = templatesCache.find((x) => x.id === btn.closest("tr")?.dataset.id);
      if (!tpl) return;
      document.getElementById("tpl-id").value = tpl.id;
      document.getElementById("tpl-name").value = tpl.name;
      document.getElementById("tpl-desc").value = tpl.description || "";
      document.getElementById("tpl-content").value = tpl.content;
      document.getElementById("tpl-form-title").textContent = `${t("templates.editForm")} ${tpl.name}`;
    });
  });
  body.querySelectorAll(".tpl-view").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tpl = templatesCache.find((x) => x.id === btn.closest("tr")?.dataset.id);
      if (tpl) openModal(tpl.name, tpl.content);
    });
  });
  body.querySelectorAll(".tpl-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest("tr")?.dataset.id;
      if (!id || !confirm(t("templates.confirmDelete"))) return;
      try {
        await api(`/api/setup/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
        toast(t("templates.deleted"), "ok");
        clearTemplateForm();
        await refreshTemplates();
        await refreshStatus();
      } catch (e) {
        toast(e.message, "err");
      }
    });
  });
}

async function refreshMemory() {
  const r = await api("/api/setup/memory?deviceId=global");
  memoryCache = r.entries || [];
  const body = document.getElementById("memory-body");
  body.innerHTML = memoryCache.length
    ? memoryCache
        .map(
          (e) => `<tr data-id="${e.id}">
        <td><strong>${escapeHtml(e.title)}</strong></td>
        <td>${escapeHtml(e.kind)}</td>
        <td class="preview">${escapeHtml(e.preview)}</td>
        <td class="actions">
          <button type="button" class="btn ghost mem-view">${t("view")}</button>
          <button type="button" class="btn ghost mem-del">${t("delete")}</button>
        </td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">${t("memory.empty")}</td></tr>`;

  body.querySelectorAll(".mem-view").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const e = memoryCache.find((x) => x.id === btn.closest("tr")?.dataset.id);
      if (!e) return;
      openModal(e.title, `${e.preview}\n\n${t("memory.fullInFile")}`);
    });
  });
  body.querySelectorAll(".mem-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest("tr")?.dataset.id;
      if (!id || !confirm(t("memory.confirmDelete"))) return;
      try {
        await api(`/api/setup/memory/${encodeURIComponent(id)}?deviceId=global`, { method: "DELETE" });
        toast(t("memory.entryDeleted"), "ok");
        await refreshMemory();
        await refreshStatus();
      } catch (e) {
        toast(e.message, "err");
      }
    });
  });
}

function ragStatusLabel(rag) {
  if (!rag) return "—";
  switch (rag.status) {
    case "ready":
      return "✓";
    case "indexing":
      return "…";
    case "stale":
      return "!";
    case "error":
      return "✗";
    default:
      return "—";
  }
}

function ragStatusText(rag) {
  if (!rag) return t("rag.noData");
  const map = {
    ready: t("rag.ready"),
    indexing: t("rag.indexingStatus"),
    stale: t("rag.stale"),
    error: t("rag.error", { msg: rag.lastError || "?" }),
    empty: t("rag.empty"),
  };
  return map[rag.status] || rag.status;
}

function ragTypeLabel(type) {
  if (type === "memory") return t("rag.typeMemory");
  if (type === "standard") return t("rag.typeStandard");
  return t("rag.typeTemplate");
}

async function refreshRag() {
  const rag = await api("/api/setup/rag");
  document.getElementById("rag-stats").innerHTML = `
    <div class="stat-card ${rag.ready ? "ok" : rag.status === "error" ? "warn" : ""}">
      <div class="label">${t("rag.status")}</div>
      <div class="value">${ragStatusLabel(rag)}</div>
      <div class="sub">${escapeHtml(ragStatusText(rag))}</div>
    </div>
    <div class="stat-card">
      <div class="label">${t("rag.fragments")}</div>
      <div class="value">${rag.chunkCount ?? 0}</div>
      <div class="sub">${t("rag.chunkUnit")}</div>
    </div>
    <div class="stat-card">
      <div class="label">${t("rag.sourcesLabel")}</div>
      <div class="value">${rag.sourceCount ?? 0}</div>
      <div class="sub">${rag.staleSources ? t("rag.staleCount", { n: rag.staleSources }) : t("rag.synced")}</div>
    </div>
    <div class="stat-card">
      <div class="label">${t("rag.embeddings")}</div>
      <div class="value">${rag.embeddings ? "✓" : "—"}</div>
      <div class="sub">${escapeHtml(rag.embedModel || t("rag.lexical"))}</div>
    </div>`;

  inline(document.getElementById("rag-status-line"), ragStatusText(rag), rag.ready ? "ok" : rag.status === "error" ? "err" : "warn");

  const when = rag.lastIndexedAt ? new Date(rag.lastIndexedAt).toLocaleString(localeTag()) : t("never");
  document.getElementById("rag-meta").innerHTML = `
    <dt>${t("rag.lastIndex")}</dt><dd>${escapeHtml(when)}</dd>
    <dt>${t("rag.searchMode")}</dt><dd>${rag.embeddings ? `Ollama ${escapeHtml(rag.embedModel)}` : t("rag.lexicalMode")}</dd>
    <dt>${t("rag.voiceHints")}</dt><dd>${t("rag.voiceCmds")}</dd>`;

  const srcBody = document.getElementById("rag-sources-body");
  srcBody.innerHTML = (rag.sources || []).length
    ? rag.sources
        .map(
          (s) => `<tr>
        <td>${escapeHtml(ragTypeLabel(s.type))}</td>
        <td><strong>${escapeHtml(s.title)}</strong>${s.deviceId ? ` <span class="muted">(${escapeHtml(s.deviceId)})</span>` : ""}</td>
        <td>${s.chunks}</td>
        <td>${s.chars}</td>
        <td>${s.inRag ? `<span class="badge on">${t("yes")}</span>` : `<span class="badge off">${t("no")}</span>`}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" class="muted">${t("rag.noSources")}</td></tr>`;
}

document.getElementById("rag-reindex").addEventListener("click", async () => {
  const btn = document.getElementById("rag-reindex");
  btn.disabled = true;
  inline(document.getElementById("rag-status-line"), t("rag.indexing"), "warn");
  try {
    const r = await api("/api/setup/rag/reindex", { method: "POST", body: JSON.stringify({ force: true }) });
    toast(r.message || (r.ready ? t("rag.readyToast") : t("rag.indexDone")), r.ready ? "ok" : "info");
    await refreshRag();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
    await refreshRag();
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("rag-search").addEventListener("click", async () => {
  const query = document.getElementById("rag-query").value.trim();
  if (!query) return toast(t("rag.needQuery"), "err");
  try {
    const r = await api("/api/setup/rag/search", { method: "POST", body: JSON.stringify({ query }) });
    const body = document.getElementById("rag-hits-body");
    body.innerHTML = (r.hits || []).length
      ? r.hits
          .map(
            (h) => `<tr>
          <td class="preview"><strong>${escapeHtml(h.title)}</strong><br>${escapeHtml(h.text.slice(0, 180))}…</td>
          <td>${escapeHtml(ragTypeLabel(h.sourceType))}</td>
          <td>${h.score}</td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="3" class="muted">${r.ready ? t("rag.noHits") : t("rag.notReady")}</td></tr>`;
  } catch (e) {
    toast(e.message, "err");
  }
});

async function refreshStandards() {
  const r = await api("/api/setup/standards");
  const hint = document.getElementById("standards-poppler-hint");
  if (hint) {
    if (r.poppler) {
      hint.textContent = t("standards.popplerOk");
      hint.className = "hint ok";
    } else {
      hint.innerHTML = t("standards.popplerMissing");
      hint.className = "hint warn";
    }
  }
  const body = document.getElementById("standards-body");
  body.innerHTML = (r.standards || []).length
    ? r.standards
        .map(
          (s) => `<tr>
        <td><code>${escapeHtml(s.filename)}</code></td>
        <td>${escapeHtml(s.name)}</td>
        <td>${s.chars} ${t("standards.chars")}</td>
        <td><button type="button" class="btn ghost std-del" data-file="${encodeURIComponent(s.filename)}">${t("delete")}</button></td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">${t("standards.empty")}</td></tr>`;

  body.querySelectorAll(".std-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const file = decodeURIComponent(btn.dataset.file || "");
      if (!file || !confirm(t("standards.confirmDelete", { file }))) return;
      try {
        await api(`/api/setup/standards/${encodeURIComponent(file)}`, { method: "DELETE" });
        toast(t("standards.deleted"), "ok");
        await refreshStandards();
        await refreshStatus();
      } catch (e) {
        toast(e.message, "err");
      }
    });
  });
}

async function refreshSkills() {
  const r = await api("/api/setup/skills");
  document.getElementById("n8n-base").value = r.n8nBaseUrl || "";
  document.getElementById("n8n-auth").value = r.n8nAuthHeader || "";
  const body = document.getElementById("skills-body");
  body.innerHTML = (r.skills || []).length
    ? r.skills
        .map(
          (s) => `<tr>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td class="preview">${escapeHtml(s.description)}</td>
        <td><code>${escapeHtml(s.webhook)}</code></td>
        <td><button type="button" class="btn ghost skill-del" data-name="${encodeURIComponent(s.name)}">${t("delete")}</button></td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">${t("skills.empty")}</td></tr>`;

  body.querySelectorAll(".skill-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const name = decodeURIComponent(btn.dataset.name || "");
      if (!name || !confirm(t("skills.confirmDelete", { name }))) return;
      try {
        await api(`/api/setup/skills/${encodeURIComponent(name)}`, { method: "DELETE" });
        toast(t("skills.deleted", { name }), "ok");
        await refreshSkills();
        await refreshStatus();
      } catch (e) {
        toast(e.message, "err");
      }
    });
  });
}

function loadSettingsForm() {
  document.getElementById("web-enabled").checked = statusData.webSearchEnabled !== false;
}

const modal = document.getElementById("view-modal");
function openModal(title, body) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").textContent = body;
  modal.showModal();
}
document.getElementById("modal-close").addEventListener("click", () => modal.close());
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.close();
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const panel = tab.closest(".card-block") || document;
    panel.querySelectorAll(".tab").forEach((tb) => tb.classList.remove("active"));
    panel.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab)?.classList.add("active");
  });
});

document.getElementById("gh-callback").textContent = `${baseUrl()}/api/setup/github/callback`;
document.getElementById("ui-callback").textContent = `${baseUrl()}/api/setup/uipath/callback`;

document.getElementById("btn-refresh").addEventListener("click", async () => {
  try {
    await refreshStatus();
    loadPage(document.querySelector(".page.active")?.dataset.page || "dashboard");
    toast(t("toast.refreshed"), "ok");
  } catch (e) {
    toast(e.message, "err");
  }
});

document.getElementById("btn-test-all").addEventListener("click", async () => {
  const parts = [];
  try {
    const gh = await api("/api/setup/github/test", { method: "POST", body: "{}" });
    parts.push(`GitHub: ${gh.message}`);
  } catch (e) {
    parts.push(`GitHub: ${e.message}`);
  }
  try {
    const ui = await api("/api/setup/uipath/test", { method: "POST", body: "{}" });
    parts.push(`UiPath: ${ui.message}`);
  } catch (e) {
    parts.push(`UiPath: ${e.message}`);
  }
  toast(parts.join(" · "), parts.every((p) => p.includes("OK") || p.includes("Połączono") || p.includes("Connected")) ? "ok" : "err");
  await refreshStatus();
});

document.getElementById("gh-save-config").addEventListener("click", async () => {
  try {
    await api("/api/setup/github/config", {
      method: "POST",
      body: JSON.stringify({
        clientId: document.getElementById("gh-client-id").value,
        clientSecret: document.getElementById("gh-client-secret").value,
      }),
    });
    toast(t("toast.ghOAuthSaved"), "ok");
  } catch (e) {
    toast(e.message, "err");
  }
});
document.getElementById("gh-oauth-start").addEventListener("click", () => {
  location.href = "/api/setup/github/start";
});
document.getElementById("gh-pat-save").addEventListener("click", async () => {
  try {
    const r = await api("/api/setup/github/pat", {
      method: "POST",
      body: JSON.stringify({ token: document.getElementById("gh-pat-token").value }),
    });
    toast(r.message, "ok");
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});

document.getElementById("ui-save-config").addEventListener("click", async () => {
  try {
    await api("/api/setup/uipath/config", {
      method: "POST",
      body: JSON.stringify({
        accountUrl: document.getElementById("ui-account").value,
        organization: document.getElementById("ui-org").value,
        tenant: document.getElementById("ui-tenant").value,
        clientId: document.getElementById("ui-client-id").value,
        clientSecret: document.getElementById("ui-client-secret").value,
      }),
    });
    toast(t("toast.uiSaved"), "ok");
  } catch (e) {
    toast(e.message, "err");
  }
});
document.getElementById("ui-oauth-start").addEventListener("click", () => {
  location.href = "/api/setup/uipath/start";
});

document.getElementById("tpl-new").addEventListener("click", clearTemplateForm);
document.getElementById("tpl-cancel").addEventListener("click", clearTemplateForm);
document.getElementById("tpl-save").addEventListener("click", async () => {
  const name = document.getElementById("tpl-name").value.trim();
  const content = document.getElementById("tpl-content").value.trim();
  const description = document.getElementById("tpl-desc").value.trim();
  const id = document.getElementById("tpl-id").value.trim();
  if (!name || !content) return toast(t("templates.needNameContent"), "err");
  try {
    const body = { name, content, description };
    if (id) body.id = id;
    const r = await api("/api/setup/templates", { method: "POST", body: JSON.stringify(body) });
    toast(`${t("templates.saved")} ${r.template.name}`, "ok");
    clearTemplateForm();
    await refreshTemplates();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});
document.getElementById("tpl-file").addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;
  const name = document.getElementById("tpl-name").value.trim() || file.name.replace(/\.[^.]+$/, "");
  try {
    const r = await api("/api/setup/templates/upload", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, name, base64: arrayBufferToBase64(await file.arrayBuffer()) }),
    });
    toast(`${t("templates.imported")} ${r.template.name}`, "ok");
    ev.target.value = "";
    await refreshTemplates();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});
document.getElementById("tpl-sample").addEventListener("click", async () => {
  try {
    const r = await api("/api/setup/templates/sample", { method: "POST", body: "{}" });
    toast(`${t("templates.sampleAdded")} ${r.template.name}`, "ok");
    await refreshTemplates();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});

document.getElementById("memory-learn").addEventListener("click", async () => {
  const text = document.getElementById("memory-text").value.trim();
  if (!text) return toast(t("memory.needNote"), "err");
  try {
    const r = await api("/api/setup/memory/learn", {
      method: "POST",
      body: JSON.stringify({ text, deviceId: "global", force: true }),
    });
    toast(`${t("memory.saved")} ${r.entry.title}`, "ok");
    document.getElementById("memory-text").value = "";
    await refreshMemory();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});
document.getElementById("memory-file").addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;
  try {
    const r = await api("/api/setup/memory/upload", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        base64: arrayBufferToBase64(await file.arrayBuffer()),
        deviceId: "global",
        force: true,
      }),
    });
    toast(`${t("memory.added")} ${r.entry.title}`, "ok");
    ev.target.value = "";
    await refreshMemory();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});
document.getElementById("memory-clear").addEventListener("click", async () => {
  if (!confirm(t("memory.confirmClear"))) return;
  try {
    const r = await api("/api/setup/memory/clear", {
      method: "POST",
      body: JSON.stringify({ deviceId: "global" }),
    });
    toast(t("memory.cleared", { n: r.cleared }), "ok");
    await refreshMemory();
    await refreshStatus();
    if (document.querySelector('.page[data-page="rag"].active')) await refreshRag();
  } catch (e) {
    toast(e.message, "err");
  }
});

document.getElementById("memory-reset-all").addEventListener("click", async () => {
  if (!confirm(t("memory.confirmReset"))) return;
  try {
    const r = await api("/api/setup/knowledge/reset", { method: "POST", body: "{}" });
    toast(r.message || t("memory.cleared", { n: r.cleared }), "ok");
    await refreshMemory();
    await refreshStatus();
    await refreshRag();
  } catch (e) {
    toast(e.message, "err");
  }
});

document.getElementById("standards-file").addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;
  try {
    const r = await api("/api/setup/standards/upload", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, base64: arrayBufferToBase64(await file.arrayBuffer()) }),
    });
    toast(`${t("standards.uploaded")} ${r.standard.name}`, "ok");
    ev.target.value = "";
    await refreshStandards();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});

document.getElementById("skills-import").addEventListener("click", async () => {
  const raw = document.getElementById("skills-json").value.trim();
  if (!raw) return toast(t("skills.needJson"), "err");
  try {
    const parsed = JSON.parse(raw);
    const r = await api("/api/setup/skills/import", {
      method: "POST",
      body: JSON.stringify({ skills: parsed.skills ?? parsed, merge: true }),
    });
    toast(t("skills.imported", { n: r.count }), "ok");
    await refreshSkills();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});
document.getElementById("skills-reload").addEventListener("click", () => refreshSkills().catch((e) => toast(e.message, "err")));
document.getElementById("n8n-save").addEventListener("click", async () => {
  try {
    const r = await api("/api/setup/n8n/config", {
      method: "POST",
      body: JSON.stringify({
        n8nBaseUrl: document.getElementById("n8n-base").value,
        n8nAuthHeader: document.getElementById("n8n-auth").value,
      }),
    });
    toast(r.message, "ok");
  } catch (e) {
    toast(e.message, "err");
  }
});

document.getElementById("web-save").addEventListener("click", async () => {
  try {
    const r = await api("/api/setup/web/config", {
      method: "POST",
      body: JSON.stringify({
        serperApiKey: document.getElementById("serper-key").value,
        webSearchEnabled: document.getElementById("web-enabled").checked,
      }),
    });
    toast(r.message, "ok");
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});
document.getElementById("finish").addEventListener("click", async () => {
  try {
    const r = await api("/api/setup/finish", { method: "POST", body: "{}" });
    toast(r.message, "ok");
    inline(document.getElementById("finish-status"), r.message, "ok");
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});

applySetupI18n();

const params = new URLSearchParams(location.search);
if (params.get("error")) {
  toast(params.get("error"), "err");
  showPage("integrations");
} else if (params.get("github") === "connected") {
  toast(`GitHub: @${params.get("login") || "?"}`, "ok");
  showPage("integrations");
} else if (params.get("uipath") === "connected") {
  toast(t("toast.uipathConnected"), "ok");
  showPage("integrations");
} else {
  const LEGACY = { knowledge: "templates", summary: "dashboard", memory: "memory" };
  const raw = location.hash.replace("#", "");
  const hash = LEGACY[raw] || raw;
  showPage(getPages()[hash] ? hash : "dashboard");
}

refreshStatus().catch((e) => toast(e.message, "err"));
