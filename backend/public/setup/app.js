const STEP_LABELS = ["Start", "GitHub", "UiPath", "Szablony", "Standardy", "Skille", "Gotowe"];
let currentStep = 0;
let statusData = {};
let editingTemplateId = "";

const stepsEl = document.getElementById("steps");
const sections = [...document.querySelectorAll(".step")];

function renderSteps() {
  stepsEl.innerHTML = STEP_LABELS.map((label, i) => {
    let cls = "";
    if (i === currentStep) cls = "active";
    else if (i < currentStep) cls = "done";
    return `<span class="${cls}">${i + 1}. ${label}</span>`;
  }).join("");
}

function go(step) {
  currentStep = Math.max(0, Math.min(STEP_LABELS.length - 1, step));
  sections.forEach((s) => s.classList.toggle("active", Number(s.dataset.step) === currentStep));
  renderSteps();
  if (currentStep === 3) {
    refreshTemplatesPanel();
    refreshMemoryPanel();
  }
  if (currentStep === 4) refreshStandardsPanel();
  if (currentStep === 5) refreshSkillsPanel();
  if (currentStep === 6) renderSummary();
}

function showStatus(el, text, kind = "info") {
  if (!el) return;
  el.textContent = text;
  el.className = `status show ${kind}`;
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

/** Base64 encode without stack overflow on large PDFs (chunked). */
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function baseUrl() {
  return `${window.location.protocol}//${window.location.host}`;
}

async function refreshStatus() {
  statusData = await api("/api/setup/status");
  const gh = statusData.github;
  const ui = statusData.uipath;
  if (gh?.connected) {
    showStatus(document.getElementById("gh-status"), `GitHub: @${gh.login || "połączono"}`, "ok");
  }
  if (ui?.connected) {
    showStatus(document.getElementById("ui-status"), `UiPath: ${ui.organization}/${ui.tenant}`, "ok");
  }
}

async function refreshTemplatesPanel() {
  const countEl = document.getElementById("templates-count");
  const body = document.getElementById("templates-body");
  try {
    const r = await api("/api/setup/templates");
    showStatus(countEl, `Szablony dokumentacji: ${r.count}`, r.count > 0 ? "ok" : "info");
    body.innerHTML = (r.templates || [])
      .map(
        (t) =>
          `<tr data-id="${t.id}">` +
          `<td><strong>${escapeHtml(t.name)}</strong></td>` +
          `<td>${escapeHtml(t.description || "—")}</td>` +
          `<td>${t.content.length}</td>` +
          `<td><button type="button" class="btn ghost tpl-edit">Edytuj</button> ` +
          `<button type="button" class="btn ghost tpl-del">Usuń</button></td></tr>`,
      )
      .join("") ||
      `<tr><td colspan="4" class="muted">Brak szablonów — dodaj nazwę i treść poniżej.</td></tr>`;

    body.querySelectorAll(".tpl-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest("tr");
        const id = row?.dataset.id;
        const t = (r.templates || []).find((x) => x.id === id);
        if (!t) return;
        editingTemplateId = t.id;
        document.getElementById("tpl-name").value = t.name;
        document.getElementById("tpl-desc").value = t.description || "";
        document.getElementById("tpl-content").value = t.content;
        showStatus(document.getElementById("templates-status"), `Edycja: ${t.name}`, "info");
      });
    });
    body.querySelectorAll(".tpl-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest("tr")?.dataset.id;
        if (!id || !confirm("Usunąć ten szablon?")) return;
        try {
          await api(`/api/setup/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
          if (editingTemplateId === id) clearTemplateForm();
          await refreshTemplatesPanel();
          await refreshStatus();
        } catch (e) {
          showStatus(document.getElementById("templates-status"), e.message, "err");
        }
      });
    });
  } catch (e) {
    showStatus(countEl, e.message, "err");
  }
}

function clearTemplateForm() {
  editingTemplateId = "";
  document.getElementById("tpl-name").value = "";
  document.getElementById("tpl-desc").value = "";
  document.getElementById("tpl-content").value = "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function refreshMemoryPanel() {
  const el = document.getElementById("memory-count");
  try {
    const r = await api("/api/setup/memory?deviceId=global");
    showStatus(el, `Globalna pamięć (fakty): ${r.count} wpisów`, "info");
  } catch (e) {
    showStatus(el, e.message, "err");
  }
}

async function refreshStandardsPanel() {
  const countEl = document.getElementById("standards-count");
  const list = document.getElementById("standards-list");
  try {
    const r = await api("/api/setup/standards");
    showStatus(countEl, `Załadowane standardy PDF: ${r.count}`, r.count > 0 ? "ok" : "info");
    list.innerHTML = (r.standards || [])
      .map(
        (s) =>
          `<li><strong>${s.name}</strong> — ${s.chars} znaków tekstu<br /><code>${s.filename}</code> ` +
          `<button class="btn ghost standards-del" data-file="${encodeURIComponent(s.filename)}" type="button">Usuń</button></li>`,
      )
      .join("") || "<li>Brak PDF — dodaj standard kodu lub code review checklist.</li>";
    list.querySelectorAll(".standards-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const file = decodeURIComponent(btn.dataset.file || "");
        if (!file || !confirm(`Usunąć ${file}?`)) return;
        try {
          await api(`/api/setup/standards/${encodeURIComponent(file)}`, { method: "DELETE" });
          await refreshStandardsPanel();
          await refreshStatus();
        } catch (e) {
          showStatus(document.getElementById("standards-status"), e.message, "err");
        }
      });
    });
  } catch (e) {
    showStatus(countEl, e.message, "err");
  }
}

async function refreshSkillsPanel() {
  try {
    const r = await api("/api/setup/skills");
    document.getElementById("n8n-base").value = r.n8nBaseUrl || "";
    document.getElementById("n8n-auth").value = r.n8nAuthHeader || "";
    const list = document.getElementById("skills-list");
    list.innerHTML = (r.skills || [])
      .map(
        (s) =>
          `<li><strong>${s.name}</strong> — ${s.description}<br /><code>${s.webhook}</code></li>`,
      )
      .join("") || "<li>Brak skilli</li>";
  } catch (e) {
    showStatus(document.getElementById("skills-status"), e.message, "err");
  }
}

function renderSummary() {
  const gh = statusData.github || {};
  const ui = statusData.uipath || {};
  document.getElementById("summary-cards").innerHTML = `
    <div class="card">
      <div><h3>GitHub</h3><small>${gh.login ? `@${gh.login}` : "nie połączono"}</small></div>
      <span class="badge ${gh.connected ? "on" : "off"}">${gh.connected ? "OK" : "brak"}</span>
    </div>
    <div class="card">
      <div><h3>UiPath Orchestrator</h3><small>${ui.organization ? `${ui.organization}/${ui.tenant}` : "nie połączono"}</small></div>
      <span class="badge ${ui.connected ? "on" : "off"}">${ui.connected ? "OK" : "brak"}</span>
    </div>
    <div class="card">
      <div><h3>Szablony docs</h3><small>${statusData.templatesCount ?? 0} szablonów</small></div>
      <span class="badge ${(statusData.templatesCount ?? 0) > 0 ? "on" : "off"}">${(statusData.templatesCount ?? 0) > 0 ? "OK" : "brak"}</span>
    </div>
    <div class="card">
      <div><h3>Pamięć (fakty)</h3><small>${statusData.memoryGlobalCount ?? 0} wpisów</small></div>
      <span class="badge ${(statusData.memoryGlobalCount ?? 0) > 0 ? "on" : "off"}">${(statusData.memoryGlobalCount ?? 0) > 0 ? "OK" : "pusta"}</span>
    </div>
    <div class="card">
      <div><h3>Standardy kodu</h3><small>${statusData.standardsCount ?? 0} PDF</small></div>
      <span class="badge ${(statusData.standardsCount ?? 0) > 0 ? "on" : "off"}">${(statusData.standardsCount ?? 0) > 0 ? "OK" : "brak"}</span>
    </div>
    <div class="card">
      <div><h3>Skille</h3><small>${(statusData.skills || []).join(", ") || "brak"}</small></div>
      <span class="badge ${(statusData.skills || []).length ? "on" : "off"}">${(statusData.skills || []).length || 0}</span>
    </div>
    <div class="card">
      <div><h3>Internet</h3><small>${statusData.webSearchEnabled ? "włączone" : "wyłączone"} · Serper ${statusData.serperApiKeySet ? "tak" : "nie"}</small></div>
      <span class="badge ${statusData.webSearchEnabled ? "on" : "off"}">${statusData.webSearchEnabled ? "OK" : "off"}</span>
    </div>
  `;
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

document.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => go(currentStep + 1)));
document.querySelectorAll("[data-prev]").forEach((b) => b.addEventListener("click", () => go(currentStep - 1)));

document.getElementById("gh-callback").textContent = `${baseUrl()}/api/setup/github/callback`;
document.getElementById("ui-callback").textContent = `${baseUrl()}/api/setup/uipath/callback`;

document.getElementById("gh-save-config").addEventListener("click", async () => {
  const el = document.getElementById("gh-status");
  try {
    await api("/api/setup/github/config", {
      method: "POST",
      body: JSON.stringify({
        clientId: document.getElementById("gh-client-id").value,
        clientSecret: document.getElementById("gh-client-secret").value,
      }),
    });
    showStatus(el, "Zapisano — kliknij „Połącz przez GitHub”.", "ok");
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("gh-oauth-start").addEventListener("click", () => {
  window.location.href = "/api/setup/github/start";
});

document.getElementById("gh-pat-save").addEventListener("click", async () => {
  const el = document.getElementById("gh-status");
  try {
    const r = await api("/api/setup/github/pat", {
      method: "POST",
      body: JSON.stringify({ token: document.getElementById("gh-pat-token").value }),
    });
    showStatus(el, r.message, "ok");
    await refreshStatus();
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("ui-save-config").addEventListener("click", async () => {
  const el = document.getElementById("ui-status");
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
    showStatus(el, "Zapisano — kliknij „Zaloguj przez UiPath”.", "ok");
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("ui-oauth-start").addEventListener("click", () => {
  window.location.href = "/api/setup/uipath/start";
});

document.getElementById("tpl-save").addEventListener("click", async () => {
  const el = document.getElementById("templates-status");
  const name = document.getElementById("tpl-name").value.trim();
  const content = document.getElementById("tpl-content").value.trim();
  const description = document.getElementById("tpl-desc").value.trim();
  if (!name || !content) return showStatus(el, "Podaj nazwę i treść szablonu.", "err");
  try {
    const body = { name, content, description };
    if (editingTemplateId) body.id = editingTemplateId;
    const r = await api("/api/setup/templates", { method: "POST", body: JSON.stringify(body) });
    showStatus(el, `Zapisano: ${r.template.name}`, "ok");
    clearTemplateForm();
    await refreshTemplatesPanel();
    await refreshStatus();
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("tpl-file").addEventListener("change", async (ev) => {
  const el = document.getElementById("templates-status");
  const file = ev.target.files?.[0];
  if (!file) return;
  const name = document.getElementById("tpl-name").value.trim() || file.name.replace(/\.[^.]+$/, "");
  try {
    const buf = await file.arrayBuffer();
    const r = await api("/api/setup/templates/upload", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, name, base64: arrayBufferToBase64(buf) }),
    });
    showStatus(el, `Import: ${r.template.name}`, "ok");
    ev.target.value = "";
    clearTemplateForm();
    await refreshTemplatesPanel();
    await refreshStatus();
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("tpl-sample").addEventListener("click", async () => {
  const el = document.getElementById("templates-status");
  try {
    const r = await api("/api/setup/templates/sample", { method: "POST", body: "{}" });
    showStatus(el, `Dodano: ${r.template.name}`, "ok");
    await refreshTemplatesPanel();
    await refreshStatus();
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("memory-learn").addEventListener("click", async () => {
  const el = document.getElementById("memory-status");
  const text = document.getElementById("memory-text").value.trim();
  if (!text) return showStatus(el, "Wpisz notatkę.", "err");
  try {
    const r = await api("/api/setup/memory/learn", {
      method: "POST",
      body: JSON.stringify({ text, deviceId: "global", force: true }),
    });
    showStatus(el, `Zapisano: ${r.entry.title}`, "ok");
    document.getElementById("memory-text").value = "";
    await refreshMemoryPanel();
    await refreshStatus();
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("memory-file").addEventListener("change", async (ev) => {
  const el = document.getElementById("memory-status");
  const file = ev.target.files?.[0];
  if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    const b64 = arrayBufferToBase64(buf);
    const r = await api("/api/setup/memory/upload", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, base64: b64, deviceId: "global", force: true }),
    });
    showStatus(el, `Dodano plik: ${r.entry.title}`, "ok");
    ev.target.value = "";
    await refreshMemoryPanel();
    await refreshStatus();
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("standards-file").addEventListener("change", async (ev) => {
  const el = document.getElementById("standards-status");
  const file = ev.target.files?.[0];
  if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    const b64 = arrayBufferToBase64(buf);
    const r = await api("/api/setup/standards/upload", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, base64: b64 }),
    });
    showStatus(el, `Wgrano: ${r.standard.name} (${r.standard.chars} znaków)`, "ok");
    ev.target.value = "";
    await refreshStandardsPanel();
    await refreshStatus();
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("standards-reload").addEventListener("click", () => refreshStandardsPanel());

document.getElementById("n8n-save").addEventListener("click", async () => {
  const el = document.getElementById("skills-status");
  try {
    const r = await api("/api/setup/n8n/config", {
      method: "POST",
      body: JSON.stringify({
        n8nBaseUrl: document.getElementById("n8n-base").value,
        n8nAuthHeader: document.getElementById("n8n-auth").value,
      }),
    });
    showStatus(el, r.message, "ok");
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("web-save").addEventListener("click", async () => {
  const el = document.getElementById("skills-status");
  try {
    const r = await api("/api/setup/web/config", {
      method: "POST",
      body: JSON.stringify({
        serperApiKey: document.getElementById("serper-key").value,
        webSearchEnabled: document.getElementById("web-enabled").checked,
      }),
    });
    showStatus(el, r.message, "ok");
    await refreshStatus();
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("skills-import").addEventListener("click", async () => {
  const el = document.getElementById("skills-status");
  const raw = document.getElementById("skills-json").value.trim();
  if (!raw) return showStatus(el, "Wklej JSON skilli.", "err");
  try {
    const parsed = JSON.parse(raw);
    const r = await api("/api/setup/skills/import", {
      method: "POST",
      body: JSON.stringify({ skills: parsed.skills ?? parsed, merge: true }),
    });
    showStatus(el, `Zaimportowano — ${r.count} skilli.`, "ok");
    await refreshSkillsPanel();
    await refreshStatus();
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

document.getElementById("skills-reload").addEventListener("click", () => refreshSkillsPanel());

document.getElementById("test-all").addEventListener("click", async () => {
  const el = document.getElementById("finish-status");
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
  showStatus(el, parts.join(" · "), parts.every((p) => p.includes("OK") || p.includes("Połączono")) ? "ok" : "info");
  await refreshStatus();
  renderSummary();
});

document.getElementById("finish").addEventListener("click", async () => {
  const el = document.getElementById("finish-status");
  try {
    const r = await api("/api/setup/finish", { method: "POST", body: "{}" });
    showStatus(el, r.message, "ok");
    await refreshStatus();
    renderSummary();
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

const params = new URLSearchParams(window.location.search);
if (params.get("error")) {
  showStatus(document.getElementById("gh-status"), params.get("error"), "err");
  go(1);
}
if (params.get("github") === "connected") {
  showStatus(document.getElementById("gh-status"), `Połączono jako @${params.get("login") || "?"}`, "ok");
  go(1);
}
if (params.get("uipath") === "connected") {
  showStatus(document.getElementById("ui-status"), "UiPath połączony.", "ok");
  go(6);
}

renderSteps();
refreshStatus().catch(() => {});

if (window.location.hash === "#github") go(1);
if (window.location.hash === "#uipath") go(2);
if (window.location.hash === "#knowledge" || window.location.hash === "#memory") go(3);
if (window.location.hash === "#standards") go(4);
if (window.location.hash === "#skills") go(5);
if (window.location.hash === "#summary") go(6);
