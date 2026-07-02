// client.mjs — browser-side script for the dependabot-triage canvas. Exported
// as a string and inlined into the served HTML page (the iframe has no
// privileged bridge, so it only talks to our own loopback HTTP endpoints).

export const CLIENT_JS = `
const STATUS_LABELS = {
  ready: "Ready to merge",
  "blocked-required": "Blocked — required check failing",
  "blocked-non-required": "Blocked — non-required check failing",
  pending: "Pending",
  draft: "Draft",
};

const app = document.getElementById("app");
let state = { loading: true, data: null, mergeResults: null, merging: false, refreshing: false };

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const OUTCOME_ICON = { fail: "✗", pending: "…", pass: "✓" };

function chip(check) {
  const reqBadge = check.required === true ? '<span class="req">REQ</span>' : "";
  const icon = OUTCOME_ICON[check.outcome] || "?";
  return \`<li class="chip \${check.outcome}" title="\${esc(check.workflowName || "")}"><span class="icon">\${icon}</span><span class="name">\${esc(check.name)}</span>\${reqBadge}</li>\`;
}

// Order: failing checks first, then pending, then passing — so the checks
// that need attention are at the top of the list instead of buried below
// a wall of green passes.
const OUTCOME_ORDER = { fail: 0, pending: 1, pass: 2 };
function sortChecks(checks) {
  return [...checks].sort((a, b) => OUTCOME_ORDER[a.outcome] - OUTCOME_ORDER[b.outcome]);
}

function prCard(pr) {
  const label = STATUS_LABELS[pr.status] || pr.status;
  const canStartSession = pr.status === "blocked-required" || pr.status === "blocked-non-required" || pr.status === "pending";
  const checksHtml = pr.checks.length
    ? \`<ul class="checks">\${sortChecks(pr.checks).map(chip).join("")}</ul>\`
    : '<div class="checks pr-meta">No checks reported.</div>';

  return \`
    <div class="pr-card" data-repo="\${esc(pr.repo)}" data-number="\${pr.number}">
      <div class="pr-top">
        <div>
          <div class="pr-repo">\${esc(pr.repo)}</div>
          <div class="pr-title"><a href="\${esc(pr.url)}" target="_blank" rel="noopener">#\${pr.number} \${esc(pr.title)}</a></div>
          <div class="pr-meta">\${esc(pr.headRefName)} → \${esc(pr.baseRefName)} · \${esc(pr.statusDetail || "")}</div>
        </div>
        <div class="pr-actions">
          <span class="badge \${pr.status}">\${esc(label)}</span>
          \${canStartSession ? \`<button class="small start-session">Start session</button>\` : ""}
        </div>
      </div>
      \${checksHtml}
    </div>\`;
}

function summaryHtml(data) {
  const prs = data.prs;
  const ready = prs.filter((p) => p.status === "ready").length;
  const blocked = prs.filter((p) => p.status === "blocked-required" || p.status === "blocked-non-required").length;
  const pending = prs.filter((p) => p.status === "pending").length;
  return \`
    <div class="summary">
      <div class="stat"><span class="n">\${prs.length}</span><span class="l">Open Dependabot PRs</span></div>
      <div class="stat ready"><span class="n">\${ready}</span><span class="l">Ready to merge</span></div>
      <div class="stat blocked"><span class="n">\${blocked}</span><span class="l">Blocked</span></div>
      <div class="stat pending"><span class="n">\${pending}</span><span class="l">Pending</span></div>
    </div>\`;
}

function errorsBanner(errors) {
  if (!errors || errors.length === 0) return "";
  const items = errors
    .map((e) => \`<li>\${esc(e.repo || "org")} — \${esc(e.stage)}: \${esc(e.message)}</li>\`)
    .join("");
  return \`
    <details class="banner error">
      <summary>⚠ \${errors.length} issue(s) while scanning — some data may be incomplete</summary>
      <ul>\${items}</ul>
    </details>\`;
}

function mergeResultsHtml(mr) {
  if (!mr) return "";
  const rows = mr.results
    .map(
      (r) =>
        \`<div class="row \${r.success ? "ok" : "fail"}"><span>\${esc(r.repo)} #\${r.number} \${esc(r.title)}</span><span>\${
          r.success ? "✓ merged" + (r.usedAutoMerge ? " (auto-merge queued)" : "") : "✗ " + esc(r.message)
        }</span></div>\`
    )
    .join("");
  return \`
    <div class="merge-results">
      <strong>Merge all green:</strong> attempted \${mr.attempted}, merged \${mr.merged}, failed \${mr.failed}
      \${rows}
    </div>\`;
}

function groupByRepo(prs) {
  const groups = new Map();
  for (const pr of prs) {
    if (!groups.has(pr.repo)) groups.set(pr.repo, []);
    groups.get(pr.repo).push(pr);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function render() {
  if (state.loading) {
    app.innerHTML = '<h1>Dependabot PR Triage</h1><div class="loading">Scanning devops-actions org…</div>';
    return;
  }
  const data = state.data;
  if (!data) {
    app.innerHTML = '<h1>Dependabot PR Triage</h1><div class="empty">No data yet. Click Refresh.</div>';
    return;
  }

  const groups = groupByRepo(data.prs);
  const groupsHtml = groups.length
    ? groups
        .map(
          ([repo, prs]) =>
            \`<div class="repo-group"><h2>\${esc(repo)} (\${prs.length})</h2>\${prs.map(prCard).join("")}</div>\`
        )
        .join("")
    : '<div class="empty">No open Dependabot PRs found across the org 🎉</div>';

  app.innerHTML = \`
    <h1>Dependabot PR Triage — devops-actions</h1>
    <div class="subtitle">Last scanned \${esc(new Date(data.scannedAt).toLocaleString())} · \${data.repos.length} repos scanned</div>
    <div class="toolbar">
      <button id="refresh-btn" \${state.refreshing ? "disabled" : ""}>\${state.refreshing ? "Refreshing…" : "Refresh"}</button>
      <button id="merge-btn" class="primary" \${state.merging ? "disabled" : ""}>\${state.merging ? "Merging…" : "Merge all green"}</button>
    </div>
    \${summaryHtml(data)}
    \${errorsBanner(data.errors)}
    \${mergeResultsHtml(state.mergeResults)}
    \${groupsHtml}
  \`;

  document.getElementById("refresh-btn").addEventListener("click", refresh);
  document.getElementById("merge-btn").addEventListener("click", mergeAllGreen);
  document.querySelectorAll(".start-session").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".pr-card");
      const repo = card.getAttribute("data-repo");
      const number = card.getAttribute("data-number");
      const pr = data.prs.find((p) => p.repo === repo && String(p.number) === number);
      startSession(pr);
    });
  });
}

async function loadData() {
  const res = await fetch("/api/data");
  return res.json();
}

async function refresh() {
  state.refreshing = true;
  render();
  try {
    const res = await fetch("/api/refresh", { method: "POST" });
    state.data = await res.json();
    state.mergeResults = null;
  } catch (err) {
    alert("Refresh failed: " + err.message);
  } finally {
    state.refreshing = false;
    render();
  }
}

async function mergeAllGreen() {
  if (!confirm("Merge all PRs currently marked Ready to merge?")) return;
  state.merging = true;
  render();
  try {
    const res = await fetch("/api/merge-all-green", { method: "POST" });
    const payload = await res.json();
    state.mergeResults = payload.mergeResult;
    state.data = payload.data;
  } catch (err) {
    alert("Merge failed: " + err.message);
  } finally {
    state.merging = false;
    render();
  }
}

async function startSession(pr) {
  if (!pr) return;
  try {
    await fetch("/api/start-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pr),
    });
    alert("Sent to Copilot chat — check the conversation for the new request.");
  } catch (err) {
    alert("Could not start session: " + err.message);
  }
}

(async function init() {
  state.loading = true;
  render();
  try {
    state.data = await loadData();
  } catch (err) {
    state.data = null;
  }
  state.loading = false;
  render();
})();
`;
