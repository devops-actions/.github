// Extension: dependabot-triage
// Triage open Dependabot PRs across the devops-actions GitHub org: check
// statuses, required checks, merge green PRs, and kick off investigation
// sessions for blocked ones.
//
// This entry file is kept focused on wiring: HTTP routing, canvas
// declaration, and calling into the sibling lib/ modules for gh CLI access
// (lib/gh.mjs), org-wide scanning (lib/scan.mjs), triage classification
// (lib/triage.mjs), merge orchestration (lib/merge.mjs), and the served
// HTML/CSS/JS (lib/render.mjs, lib/styles.mjs, lib/client.mjs).

import { createServer } from "node:http";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { scanOrg } from "./lib/scan.mjs";
import { mergeAllGreen } from "./lib/merge.mjs";
import { renderIndexHtml } from "./lib/render.mjs";

const DEFAULT_ORG = "devops-actions";

// One local HTTP server per open canvas instance (its own ephemeral port).
const servers = new Map();
// Last scan result per org, shared across instances/reopens so a rehydrated
// canvas doesn't lose data and doesn't need to immediately re-scan.
const lastScanByOrg = new Map();
// Which org each open instance is bound to (set from canvas `open` input).
const instanceOrgs = new Map();

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let raw = "";
        req.on("data", (chunk) => (raw += chunk));
        req.on("end", () => {
            if (!raw) return resolve({});
            try {
                resolve(JSON.parse(raw));
            } catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}

function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(body);
}

async function ensureScan(org) {
    let cached = lastScanByOrg.get(org);
    if (!cached) {
        cached = await scanOrg(org);
        lastScanByOrg.set(org, cached);
    }
    return cached;
}

function summarize(data) {
    const ready = data.prs.filter((p) => p.status === "ready").length;
    const blockedRequired = data.prs.filter((p) => p.status === "blocked-required").length;
    const blockedNonRequired = data.prs.filter((p) => p.status === "blocked-non-required").length;
    const pending = data.prs.filter((p) => p.status === "pending").length;
    return {
        total: data.prs.length,
        ready,
        blockedRequired,
        blockedNonRequired,
        pending,
        errorCount: data.errors.length,
        scannedAt: data.scannedAt,
    };
}

function buildStartSessionPrompt(pr) {
    const failing = (pr.checks || []).filter((c) => c.outcome !== "pass");
    const checkLines = failing.length
        ? failing
              .map(
                  (c) =>
                      `  - ${c.name} (${c.outcome}${
                          c.required === true ? ", REQUIRED" : c.required === false ? ", not required" : ", required: unknown"
                      })`
              )
              .join("\n")
        : "  (no failing/pending checks reported)";

    return [
        `Investigate the blocked Dependabot PR ${pr.repo}#${pr.number} in devops-actions/${pr.repo}.`,
        ``,
        `PR: ${pr.title}`,
        `URL: ${pr.url}`,
        `Branch: ${pr.headRefName} -> ${pr.baseRefName}`,
        `Triage status: ${pr.status} — ${pr.statusDetail || ""}`,
        `Checks of concern:`,
        checkLines,
        ``,
        `Please open/create a session for devops-actions/${pr.repo} (use create_session or open_pr_session) to look into why the check(s) above are failing or pending, and fix or advise on next steps.`,
    ].join("\n");
}

async function startServer(instanceId, session) {
    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url, "http://127.0.0.1");
            const org = instanceOrgs.get(instanceId) || DEFAULT_ORG;

            if (req.method === "GET" && url.pathname === "/") {
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(renderIndexHtml());
                return;
            }

            if (req.method === "GET" && url.pathname === "/api/data") {
                const data = await ensureScan(org);
                sendJson(res, 200, data);
                return;
            }

            if (req.method === "POST" && url.pathname === "/api/refresh") {
                const data = await scanOrg(org);
                lastScanByOrg.set(org, data);
                sendJson(res, 200, data);
                return;
            }

            if (req.method === "POST" && url.pathname === "/api/merge-all-green") {
                const cached = await ensureScan(org);
                const mergeResult = await mergeAllGreen(cached.prs, cached.mergeSettingsByRepo);
                // Re-scan so the UI reflects post-merge state (merged PRs
                // disappear, auto-merge-queued ones show updated status).
                const data = await scanOrg(org);
                lastScanByOrg.set(org, data);
                sendJson(res, 200, { mergeResult, data });
                return;
            }

            if (req.method === "POST" && url.pathname === "/api/start-session") {
                const pr = await readJsonBody(req);
                const prompt = buildStartSessionPrompt(pr);
                session.send({ prompt }).catch((error) => {
                    session.log(`dependabot-triage: session.send failed: ${error.message}`, { level: "error" });
                });
                sendJson(res, 200, { ok: true });
                return;
            }

            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not found");
        } catch (error) {
            sendJson(res, 500, { error: error.message });
        }
    });

    // Port 0 = let the OS pick a free ephemeral port. Bind to loopback only.
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "dependabot-triage",
            displayName: "Dependabot PR Triage",
            description:
                "Dashboard of open Dependabot PRs across the devops-actions GitHub org, with per-check status, required-check badges, one-click merge of all-green PRs, and buttons to start investigation sessions for blocked PRs.",
            inputSchema: {
                type: "object",
                properties: {
                    org: { type: "string", description: "GitHub org to scan.", default: DEFAULT_ORG },
                },
            },
            actions: [
                {
                    name: "refresh",
                    description: "Re-scan the org for open Dependabot PRs and return a summary.",
                    handler: async (ctx) => {
                        const org = instanceOrgs.get(ctx.instanceId) || DEFAULT_ORG;
                        const data = await scanOrg(org);
                        lastScanByOrg.set(org, data);
                        return summarize(data);
                    },
                },
                {
                    name: "merge_all_green",
                    description: "Merge every open Dependabot PR currently classified as ready-to-merge.",
                    handler: async (ctx) => {
                        const org = instanceOrgs.get(ctx.instanceId) || DEFAULT_ORG;
                        const cached = await ensureScan(org);
                        const mergeResult = await mergeAllGreen(cached.prs, cached.mergeSettingsByRepo);
                        const data = await scanOrg(org);
                        lastScanByOrg.set(org, data);
                        return { mergeResult, summary: summarize(data) };
                    },
                },
                {
                    name: "get_summary",
                    description: "Get the current cached triage summary without re-scanning.",
                    handler: async (ctx) => {
                        const org = instanceOrgs.get(ctx.instanceId) || DEFAULT_ORG;
                        const data = await ensureScan(org);
                        return summarize(data);
                    },
                },
            ],
            // Called when the agent or host opens the canvas. We boot a local
            // HTTP server on an ephemeral port and hand its URL back to the
            // host so it can render the canvas. Re-opens with the same
            // instanceId reuse the existing server (idempotent per the
            // canvas contract — `open` may be re-invoked after a provider
            // reconnect or `extensions_reload`).
            open: async (ctx) => {
                const org = (ctx.input && ctx.input.org) || DEFAULT_ORG;
                instanceOrgs.set(ctx.instanceId, org);

                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, session);
                    servers.set(ctx.instanceId, entry);
                }
                return {
                    title: `Dependabot Triage — ${org}`,
                    url: entry.url,
                };
            },
            // Tear the per-instance server down when the canvas is closed so
            // ports are not leaked across the lifetime of the extension.
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    instanceOrgs.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
