const STEP_LABELS = ["Start", "GitHub", "UiPath", "Gotowe"];
let currentStep = 0;
let statusData = {};

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
  if (currentStep === 3) renderSummary();
}

function showStatus(el, text, kind = "info") {
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
  `;
}

// Tabs
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
  } catch (e) {
    showStatus(el, e.message, "err");
  }
});

// OAuth return params
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
  go(3);
}

renderSteps();
refreshStatus().catch(() => {});

if (window.location.hash === "#github") go(1);
if (window.location.hash === "#uipath") go(2);
if (window.location.hash === "#summary") go(3);
