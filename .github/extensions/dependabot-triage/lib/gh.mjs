// gh.mjs — thin wrapper around the `gh` CLI for the dependabot-triage canvas.
//
// All GitHub data access goes through `gh` (already authenticated on this
// machine) via execFile — never a shell string — to avoid injection issues
// and keep argument handling explicit.

import { execFile } from "node:child_process";

const EXEC_TIMEOUT_MS = 30_000;
const MAX_BUFFER = 20 * 1024 * 1024; // 20MB, some repos have large check-run payloads

function runGh(args) {
    return new Promise((resolve, reject) => {
        execFile(
            "gh",
            args,
            { timeout: EXEC_TIMEOUT_MS, maxBuffer: MAX_BUFFER, windowsHide: true },
            (error, stdout, stderr) => {
                if (error) {
                    const message = (stderr && stderr.trim()) || error.message || "gh command failed";
                    const err = new Error(message);
                    err.stdout = stdout;
                    err.stderr = stderr;
                    reject(err);
                    return;
                }
                resolve(stdout);
            }
        );
    });
}

async function runGhJson(args) {
    const stdout = await runGh(args);
    const trimmed = stdout.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed);
}

/** List all repo names in a GitHub org. */
export async function listOrgRepos(org) {
    const data = await runGhJson(["repo", "list", org, "--limit", "200", "--json", "name,isArchived"]);
    return (data || []).filter((r) => !r.isArchived).map((r) => r.name);
}

/** List open PRs authored by dependabot in a given repo. */
export async function listDependabotPRs(repoFullName) {
    const data = await runGhJson([
        "pr",
        "list",
        "--repo",
        repoFullName,
        "--author",
        "app/dependabot",
        "--state",
        "open",
        "--limit",
        "50",
        "--json",
        "number,title,url,headRefName,baseRefName,statusCheckRollup,mergeStateStatus,isDraft",
    ]);
    return data || [];
}

/** Repo-level merge settings: which merge methods & auto-merge are allowed. */
export async function getRepoMergeSettings(repoFullName) {
    const data = await runGhJson(["api", `repos/${repoFullName}`]);
    return {
        allowAutoMerge: !!data.allow_auto_merge,
        allowSquashMerge: !!data.allow_squash_merge,
        allowMergeCommit: !!data.allow_merge_commit,
        allowRebaseMerge: !!data.allow_rebase_merge,
        defaultBranch: data.default_branch,
    };
}

/**
 * Determine the required status-check names for a base branch, checking both
 * classic branch protection and the newer rulesets API. Returns
 * `{ required: Set<string> | null, source: string }` — `required` is `null`
 * when neither API is accessible, meaning "unknown" (never "no checks").
 */
export async function getRequiredChecks(repoFullName, baseBranch) {
    const names = new Set();
    let gotProtection = false;
    let gotRules = false;

    try {
        const protection = await runGhJson([
            "api",
            `repos/${repoFullName}/branches/${encodeURIComponent(baseBranch)}/protection`,
        ]);
        const contexts = protection?.required_status_checks?.contexts || [];
        for (const c of contexts) names.add(c);
        const checks = protection?.required_status_checks?.checks || [];
        for (const c of checks) if (c?.context) names.add(c.context);
        gotProtection = true;
    } catch {
        // No classic protection configured, or not accessible — fall back to rulesets.
    }

    try {
        const rules = await runGhJson([
            "api",
            `repos/${repoFullName}/rules/branches/${encodeURIComponent(baseBranch)}`,
        ]);
        for (const rule of rules || []) {
            if (rule?.type === "required_status_checks") {
                const checks = rule?.parameters?.required_status_checks || [];
                for (const c of checks) if (c?.context) names.add(c.context);
                gotRules = true;
            }
        }
    } catch {
        // Rulesets not accessible either.
    }

    if (!gotProtection && !gotRules) {
        return { required: null, source: "unknown" };
    }
    return { required: names, source: gotProtection && gotRules ? "both" : gotProtection ? "protection" : "rules" };
}

/**
 * Attempt to merge a PR, choosing the best available merge method and
 * falling back to a direct merge when repo-level auto-merge isn't enabled.
 */
export async function mergePR(repoFullName, number, settings) {
    const methodFlag = settings.allowSquashMerge
        ? "--squash"
        : settings.allowMergeCommit
        ? "--merge"
        : settings.allowRebaseMerge
        ? "--rebase"
        : "--squash"; // last resort; gh will report a clear error if unsupported

    const args = ["pr", "merge", String(number), "--repo", repoFullName, methodFlag];
    if (settings.allowAutoMerge) args.push("--auto");

    try {
        const stdout = await runGh(args);
        return { success: true, message: stdout.trim() || "Merged.", usedAutoMerge: !!settings.allowAutoMerge };
    } catch (error) {
        return { success: false, message: error.message, usedAutoMerge: !!settings.allowAutoMerge };
    }
}
