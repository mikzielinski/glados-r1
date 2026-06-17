/** OKO Admin Panel — single-page dashboard */

const PAGES = {
  dashboard: { title: "Pulpit", sub: "Stan systemu OKO na Macu" },
  integrations: { title: "Integracje", sub: "GitHub, UiPath Orchestrator" },
  templates: { title: "Szablony dokumentacji", sub: "Nazwa + wzór treści docs" },
  memory: { title: "Pamięć", sub: "Fakty i notatki kontekstowe" },
  rag: { title: "Indeks RAG", sub: "Wiedza dostępna dla agenta" },
  standards: { title: "Standardy kodu", sub: "Normy PDF dla code review" },
  skills: { title: "Skille", sub: "Webhooki lokalne i n8n" },
  settings: { title: "Ustawienia", sub: "Internet, aktywacja, linki" },
};

let statusData = {};
let templatesCache = [];
let memoryCache = [];

// ── Utils ─────────────────────────────────────────────────────────────

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

// ── Navigation ──────────────────────────────────────────────────────

function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.dataset.page === id));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.page === id));
  const meta = PAGES[id] || PAGES.dashboard;
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

// ── Status & dashboard ───────────────────────────────────────────────

async function refreshStatus() {
  statusData = await api("/api/setup/status");
  updateBadges();
  renderDashboard();
  document.getElementById("sys-status").textContent =
    `Backend :${statusData.port || 8787} · ${statusData.brainMode || "?"}`;
}

function updateBadges() {
  const gh = statusData.github || {};
  const ui = statusData.uipath || {};
  const ghB = document.getElementById("gh-badge");
  const uiB = document.getElementById("ui-badge");
  if (ghB) {
    ghB.textContent = gh.connected ? `@${gh.login || "OK"}` : "offline";
    ghB.className = `badge ${gh.connected ? "on" : "off"}`;
  }
  if (uiB) {
    uiB.textContent = ui.connected ? "OK" : "offline";
    uiB.className = `badge ${ui.connected ? "on" : "off"}`;
  }
  if (gh.connected) inline(document.getElementById("gh-status"), `Połączono: @${gh.login}`, "ok");
  if (ui.connected) inline(document.getElementById("ui-status"), `${ui.organization}/${ui.tenant}`, "ok");
}

function renderDashboard() {
  const gh = statusData.github || {};
  const ui = statusData.uipath || {};
  document.getElementById("dash-stats").innerHTML = `
    <div class="stat-card ${gh.connected ? "ok" : "warn"}">
      <div class="label">GitHub</div>
      <div class="value">${gh.connected ? "✓" : "—"}</div>
      <div class="sub">${gh.login ? `@${gh.login}` : "nie połączono"}</div>
    </div>
    <div class="stat-card ${ui.connected ? "ok" : "warn"}">
      <div class="label">UiPath</div>
      <div class="value">${ui.connected ? "✓" : "—"}</div>
      <div class="sub">${ui.organization || "brak"}</div>
    </div>
    <div class="stat-card">
      <div class="label">Szablony</div>
      <div class="value">${statusData.templatesCount ?? 0}</div>
      <div class="sub">dokumentacja</div>
    </div>
    <div class="stat-card">
      <div class="label">Standardy</div>
      <div class="value">${statusData.standardsCount ?? 0}</div>
      <div class="sub">PDF kodu</div>
    </div>
    <div class="stat-card">
      <div class="label">Pamięć</div>
      <div class="value">${statusData.memoryGlobalCount ?? 0}</div>
      <div class="sub">faktów</div>
    </div>
    <div class="stat-card ${(statusData.rag || {}).ready ? "ok" : "warn"}">
      <div class="label">RAG</div>
      <div class="value">${ragStatusLabel(statusData.rag)}</div>
      <div class="sub">${statusData.rag?.chunkCount ?? 0} fragmentów</div>
    </div>
    <div class="stat-card">
      <div class="label">Skille</div>
      <div class="value">${(statusData.skills || []).length}</div>
      <div class="sub">aktywnych</div>
    </div>
  `;
  document.getElementById("sys-meta").innerHTML = `
    <dt>Tryb mózgu</dt><dd>${escapeHtml(statusData.brainMode || "—")}</dd>
    <dt>Repozytorium</dt><dd>${escapeHtml(statusData.repoPath || "—")}</dd>
    <dt>Internet</dt><dd>${statusData.webSearchEnabled ? "włączony" : "wyłączony"} · Serper ${statusData.serperApiKeySet ? "tak" : "nie"}</dd>
    <dt>URL panelu</dt><dd>${escapeHtml(statusData.setupUrl || baseUrl() + "/setup")}</dd>
  `;
  document.getElementById("dash-skills").innerHTML = (statusData.skills || [])
    .map((s) => `<span class="tag">${escapeHtml(s)}</span>`)
    .join("") || '<span class="muted">Brak skilli</span>';
}

// ── Templates ───────────────────────────────────────────────────────

function clearTemplateForm() {
  document.getElementById("tpl-id").value = "";
  document.getElementById("tpl-name").value = "";
  document.getElementById("tpl-desc").value = "";
  document.getElementById("tpl-content").value = "";
  document.getElementById("tpl-form-title").textContent = "Nowy szablon";
}

async function refreshTemplates() {
  const r = await api("/api/setup/templates");
  templatesCache = r.templates || [];
  const body = document.getElementById("templates-body");
  body.innerHTML = templatesCache.length
    ? templatesCache
        .map(
          (t) => `<tr data-id="${t.id}">
        <td><strong>${escapeHtml(t.name)}</strong></td>
        <td>${escapeHtml(t.description || "—")}</td>
        <td class="actions">
          <button type="button" class="btn ghost tpl-view">Podgląd</button>
          <button type="button" class="btn ghost tpl-edit">Edytuj</button>
          <button type="button" class="btn ghost tpl-del">Usuń</button>
        </td></tr>`,
        )
        .join("")
    : `<tr><td colspan="3" class="muted">Brak szablonów — kliknij „Nowy”.</td></tr>`;

  body.querySelectorAll(".tpl-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = templatesCache.find((x) => x.id === btn.closest("tr")?.dataset.id);
      if (!t) return;
      document.getElementById("tpl-id").value = t.id;
      document.getElementById("tpl-name").value = t.name;
      document.getElementById("tpl-desc").value = t.description || "";
      document.getElementById("tpl-content").value = t.content;
      document.getElementById("tpl-form-title").textContent = `Edycja: ${t.name}`;
    });
  });
  body.querySelectorAll(".tpl-view").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = templatesCache.find((x) => x.id === btn.closest("tr")?.dataset.id);
      if (t) openModal(t.name, t.content);
    });
  });
  body.querySelectorAll(".tpl-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest("tr")?.dataset.id;
      if (!id || !confirm("Usunąć szablon?")) return;
      try {
        await api(`/api/setup/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
        toast("Szablon usunięty", "ok");
        clearTemplateForm();
        await refreshTemplates();
        await refreshStatus();
      } catch (e) {
        toast(e.message, "err");
      }
    });
  });
}

// ── Memory ──────────────────────────────────────────────────────────

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
          <button type="button" class="btn ghost mem-view">Podgląd</button>
          <button type="button" class="btn ghost mem-del">Usuń</button>
        </td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">Pusta pamięć.</td></tr>`;

  body.querySelectorAll(".mem-view").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const e = memoryCache.find((x) => x.id === btn.closest("tr")?.dataset.id);
      if (!e) return;
      openModal(e.title, e.preview + "\n\n(pełna treść w pliku pamięci)");
    });
  });
  body.querySelectorAll(".mem-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest("tr")?.dataset.id;
      if (!id || !confirm("Usunąć wpis?")) return;
      try {
        await api(`/api/setup/memory/${encodeURIComponent(id)}?deviceId=global`, { method: "DELETE" });
        toast("Wpis usunięty", "ok");
        await refreshMemory();
        await refreshStatus();
      } catch (e) {
        toast(e.message, "err");
      }
    });
  });
}

// ── RAG ─────────────────────────────────────────────────────────────

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
  if (!rag) return "Brak danych";
  const map = {
    ready: "Gotowy — wiedza dostępna w RAG",
    indexing: "Indeksowanie w toku…",
    stale: "Nieaktualny — wymuś indeksowanie",
    error: `Błąd: ${rag.lastError || "nieznany"}`,
    empty: "Pusty — dodaj pamięć, PDF lub szablony",
  };
  return map[rag.status] || rag.status;
}

function ragTypeLabel(type) {
  return type === "memory" ? "Pamięć" : type === "standard" ? "Standard PDF" : "Szablon docs";
}

async function refreshRag() {
  const rag = await api("/api/setup/rag");
  document.getElementById("rag-stats").innerHTML = `
    <div class="stat-card ${rag.ready ? "ok" : rag.status === "error" ? "warn" : ""}">
      <div class="label">Status</div>
      <div class="value">${ragStatusLabel(rag)}</div>
      <div class="sub">${escapeHtml(ragStatusText(rag))}</div>
    </div>
    <div class="stat-card">
      <div class="label">Fragmenty</div>
      <div class="value">${rag.chunkCount ?? 0}</div>
      <div class="sub">chunków</div>
    </div>
    <div class="stat-card">
      <div class="label">Źródła</div>
      <div class="value">${rag.sourceCount ?? 0}</div>
      <div class="sub">${rag.staleSources ? `${rag.staleSources} nieaktualnych` : "wszystkie zsynchronizowane"}</div>
    </div>
    <div class="stat-card">
      <div class="label">Embeddings</div>
      <div class="value">${rag.embeddings ? "✓" : "—"}</div>
      <div class="sub">${escapeHtml(rag.embedModel || "słowne")}</div>
    </div>`;

  inline(document.getElementById("rag-status-line"), ragStatusText(rag), rag.ready ? "ok" : rag.status === "error" ? "err" : "warn");

  const when = rag.lastIndexedAt ? new Date(rag.lastIndexedAt).toLocaleString("pl-PL") : "nigdy";
  document.getElementById("rag-meta").innerHTML = `
    <dt>Ostatnie indeksowanie</dt><dd>${escapeHtml(when)}</dd>
    <dt>Tryb wyszukiwania</dt><dd>${rag.embeddings ? `Ollama ${escapeHtml(rag.embedModel)}` : "Słowne (bez embeddingów)"}</dd>
    <dt>Głos</dt><dd>«status rag», «wymuś indeksowanie»</dd>`;

  const srcBody = document.getElementById("rag-sources-body");
  srcBody.innerHTML = (rag.sources || []).length
    ? rag.sources
        .map(
          (s) => `<tr>
        <td>${escapeHtml(ragTypeLabel(s.type))}</td>
        <td><strong>${escapeHtml(s.title)}</strong>${s.deviceId ? ` <span class="muted">(${escapeHtml(s.deviceId)})</span>` : ""}</td>
        <td>${s.chunks}</td>
        <td>${s.chars}</td>
        <td>${s.inRag ? '<span class="badge on">tak</span>' : '<span class="badge off">nie</span>'}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" class="muted">Brak źródeł — dodaj pamięć, standardy lub szablony, potem wymuś indeksowanie.</td></tr>`;
}

document.getElementById("rag-reindex").addEventListener("click", async () => {
  const btn = document.getElementById("rag-reindex");
  btn.disabled = true;
  inline(document.getElementById("rag-status-line"), "Indeksowanie…", "warn");
  try {
    const r = await api("/api/setup/rag/reindex", { method: "POST", body: JSON.stringify({ force: true }) });
    toast(r.message || (r.ready ? "RAG gotowy" : "Indeksowanie zakończone"), r.ready ? "ok" : "info");
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
  if (!query) return toast("Podaj zapytanie", "err");
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
      : `<tr><td colspan="3" class="muted">${r.ready ? "Brak trafień." : "Indeks nie jest gotowy — wymuś indeksowanie."}</td></tr>`;
  } catch (e) {
    toast(e.message, "err");
  }
});

// ── Standards ───────────────────────────────────────────────────────

async function refreshStandards() {
  const r = await api("/api/setup/standards");
  const hint = document.getElementById("standards-poppler-hint");
  if (hint) {
    if (r.poppler) {
      hint.textContent = "Poppler (pdftotext): zainstalowany — PDF-y są poprawnie czytane.";
      hint.className = "hint ok";
    } else {
      hint.innerHTML =
        'Brak <code>poppler</code> — zainstaluj: <code>brew install poppler</code>, potem odśwież stronę.';
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
        <td>${s.chars} zn.</td>
        <td><button type="button" class="btn ghost std-del" data-file="${encodeURIComponent(s.filename)}">Usuń</button></td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">Brak PDF — wgraj standard code review.</td></tr>`;

  body.querySelectorAll(".std-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const file = decodeURIComponent(btn.dataset.file || "");
      if (!file || !confirm(`Usunąć ${file}?`)) return;
      try {
        await api(`/api/setup/standards/${encodeURIComponent(file)}`, { method: "DELETE" });
        toast("Standard usunięty", "ok");
        await refreshStandards();
        await refreshStatus();
      } catch (e) {
        toast(e.message, "err");
      }
    });
  });
}

// ── Skills ──────────────────────────────────────────────────────────

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
        <td><button type="button" class="btn ghost skill-del" data-name="${encodeURIComponent(s.name)}">Usuń</button></td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">Brak skilli.</td></tr>`;

  body.querySelectorAll(".skill-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const name = decodeURIComponent(btn.dataset.name || "");
      if (!name || !confirm(`Usunąć skill ${name}?`)) return;
      try {
        await api(`/api/setup/skills/${encodeURIComponent(name)}`, { method: "DELETE" });
        toast(`Skill ${name} usunięty`, "ok");
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

// ── Modal ───────────────────────────────────────────────────────────

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

// ── Tabs ────────────────────────────────────────────────────────────

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const panel = tab.closest(".card-block") || document;
    panel.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    panel.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab)?.classList.add("active");
  });
});

// ── Event handlers ──────────────────────────────────────────────────

document.getElementById("gh-callback").textContent = `${baseUrl()}/api/setup/github/callback`;
document.getElementById("ui-callback").textContent = `${baseUrl()}/api/setup/uipath/callback`;

document.getElementById("btn-refresh").addEventListener("click", async () => {
  try {
    await refreshStatus();
    loadPage(document.querySelector(".page.active")?.dataset.page || "dashboard");
    toast("Odświeżono", "ok");
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
  toast(parts.join(" · "), parts.every((p) => p.includes("OK") || p.includes("Połączono")) ? "ok" : "err");
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
    toast("GitHub OAuth zapisany", "ok");
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
    toast("UiPath zapisany", "ok");
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
  if (!name || !content) return toast("Podaj nazwę i treść", "err");
  try {
    const body = { name, content, description };
    if (id) body.id = id;
    const r = await api("/api/setup/templates", { method: "POST", body: JSON.stringify(body) });
    toast(`Zapisano: ${r.template.name}`, "ok");
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
    toast(`Import: ${r.template.name}`, "ok");
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
    toast(`Dodano: ${r.template.name}`, "ok");
    await refreshTemplates();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});

document.getElementById("memory-learn").addEventListener("click", async () => {
  const text = document.getElementById("memory-text").value.trim();
  if (!text) return toast("Wpisz notatkę", "err");
  try {
    const r = await api("/api/setup/memory/learn", {
      method: "POST",
      body: JSON.stringify({ text, deviceId: "global", force: true }),
    });
    toast(`Zapisano: ${r.entry.title}`, "ok");
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
    toast(`Dodano: ${r.entry.title}`, "ok");
    ev.target.value = "";
    await refreshMemory();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});
document.getElementById("memory-clear").addEventListener("click", async () => {
  if (!confirm("Wyczyścić pamięć globalną (wpisy dodane w panelu)?")) return;
  try {
    const r = await api("/api/setup/memory/clear", {
      method: "POST",
      body: JSON.stringify({ deviceId: "global" }),
    });
    toast(`Usunięto ${r.cleared} wpisów globalnych`, "ok");
    await refreshMemory();
    await refreshStatus();
    if (document.querySelector('.page[data-page="rag"].active')) await refreshRag();
  } catch (e) {
    toast(e.message, "err");
  }
});

document.getElementById("memory-reset-all").addEventListener("click", async () => {
  if (
    !confirm(
      "Pełny reset: usunie CAŁĄ pamięć (global + wszystkie urządzenia R1) i przebuduje indeks RAG.\n\nStandardy PDF i szablony docs NIE są usuwane.\n\nKontynuować?",
    )
  ) {
    return;
  }
  try {
    const r = await api("/api/setup/knowledge/reset", { method: "POST", body: "{}" });
    toast(r.message || `Reset OK — ${r.cleared} wpisów`, "ok");
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
    toast(`Wgrano: ${r.standard.name}`, "ok");
    ev.target.value = "";
    await refreshStandards();
    await refreshStatus();
  } catch (e) {
    toast(e.message, "err");
  }
});

document.getElementById("skills-import").addEventListener("click", async () => {
  const raw = document.getElementById("skills-json").value.trim();
  if (!raw) return toast("Wklej JSON", "err");
  try {
    const parsed = JSON.parse(raw);
    const r = await api("/api/setup/skills/import", {
      method: "POST",
      body: JSON.stringify({ skills: parsed.skills ?? parsed, merge: true }),
    });
    toast(`Zaimportowano ${r.count} skilli`, "ok");
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

// ── Boot ────────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
if (params.get("error")) {
  toast(params.get("error"), "err");
  showPage("integrations");
} else if (params.get("github") === "connected") {
  toast(`GitHub: @${params.get("login") || "?"}`, "ok");
  showPage("integrations");
} else if (params.get("uipath") === "connected") {
  toast("UiPath połączony", "ok");
  showPage("integrations");
} else {
  const LEGACY = { knowledge: "templates", summary: "dashboard", memory: "memory" };
  const raw = location.hash.replace("#", "");
  const hash = LEGACY[raw] || raw;
  showPage(PAGES[hash] ? hash : "dashboard");
}

refreshStatus().catch((e) => toast(e.message, "err"));
