// scan.mjs — orchestrates a full org scan: enumerate repos, fetch open
// dependabot PRs per repo, resolve required checks, and triage each PR.
// Designed to be resilient: one repo's gh failure never aborts the scan.

import { listOrgRepos, listDependabotPRs, getRepoMergeSettings, getRequiredChecks } from "./gh.mjs";
import { triagePR } from "./triage.mjs";

/** Run `items` through `worker` with at most `limit` in flight at once. */
async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    async function runNext() {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await worker(items[index], index);
        }
    }
    const workers = Array.from({ length: Math.min(limit, items.length) }, runNext);
    await Promise.all(workers);
    return results;
}

/**
 * Scan the given org for open dependabot PRs and triage every one.
 * Returns `{ repos, prs, errors, mergeSettingsByRepo, scannedAt }`.
 * `errors` collects per-repo failures without aborting the overall scan.
 */
export async function scanOrg(org) {
    const errors = [];
    let repoNames = [];
    try {
        repoNames = await listOrgRepos(org);
    } catch (error) {
        errors.push({ repo: null, stage: "list-org-repos", message: error.message });
        return { repos: [], prs: [], errors, mergeSettingsByRepo: {}, scannedAt: new Date().toISOString() };
    }

    const perRepoResults = await mapWithConcurrency(repoNames, 8, async (name) => {
        const repoFullName = `${org}/${name}`;
        try {
            const rawPRs = await listDependabotPRs(repoFullName);
            if (rawPRs.length === 0) {
                return { repo: name, repoFullName, prs: [], mergeSettings: null };
            }

            let mergeSettings = null;
            try {
                mergeSettings = await getRepoMergeSettings(repoFullName);
            } catch (error) {
                errors.push({ repo: name, stage: "merge-settings", message: error.message });
            }

            // Resolve required checks once per unique base branch used by this repo's PRs.
            const baseBranches = [...new Set(rawPRs.map((pr) => pr.baseRefName))];
            const requiredByBranch = new Map();
            for (const branch of baseBranches) {
                try {
                    const { required, source } = await getRequiredChecks(repoFullName, branch);
                    requiredByBranch.set(branch, required);
                    if (source === "unknown") {
                        errors.push({
                            repo: name,
                            stage: "required-checks",
                            message: `Could not determine required checks for branch "${branch}" (marked unknown).`,
                            level: "warning",
                        });
                    }
                } catch (error) {
                    requiredByBranch.set(branch, null);
                    errors.push({ repo: name, stage: "required-checks", message: error.message });
                }
            }

            const prs = rawPRs.map((pr) => {
                const required = requiredByBranch.get(pr.baseRefName) ?? null;
                const triaged = triagePR(pr, required);
                return { ...triaged, repo: name, repoFullName };
            });

            return { repo: name, repoFullName, prs, mergeSettings };
        } catch (error) {
            errors.push({ repo: name, stage: "list-prs", message: error.message });
            return { repo: name, repoFullName, prs: [], mergeSettings: null, failed: true };
        }
    });

    const prs = [];
    const mergeSettingsByRepo = {};
    for (const r of perRepoResults) {
        prs.push(...r.prs);
        if (r.mergeSettings) mergeSettingsByRepo[r.repo] = r.mergeSettings;
    }

    return {
        repos: repoNames,
        prs,
        errors,
        mergeSettingsByRepo,
        scannedAt: new Date().toISOString(),
    };
}
