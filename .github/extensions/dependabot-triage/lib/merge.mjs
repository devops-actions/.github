// merge.mjs — "Merge all green" orchestration: merges every PR the last scan
// classified as "ready", using each repo's actual merge settings.

import { mergePR } from "./gh.mjs";

/**
 * @param {Array} prs - triaged PR records (from scan.mjs), each with
 *   { repo, repoFullName, number, status, title, url }
 * @param {object} mergeSettingsByRepo - map of repo name -> merge settings
 */
export async function mergeAllGreen(prs, mergeSettingsByRepo) {
    const ready = prs.filter((pr) => pr.status === "ready");
    const results = [];

    // Merge sequentially per repo isn't required, but keep concurrency modest
    // to avoid hammering the API / hitting secondary rate limits.
    const concurrency = 4;
    let cursor = 0;
    async function runNext() {
        while (cursor < ready.length) {
            const pr = ready[cursor++];
            const settings = mergeSettingsByRepo[pr.repo] || {
                allowAutoMerge: false,
                allowSquashMerge: true,
                allowMergeCommit: false,
                allowRebaseMerge: false,
            };
            try {
                const outcome = await mergePR(pr.repoFullName, pr.number, settings);
                results.push({
                    repo: pr.repo,
                    number: pr.number,
                    title: pr.title,
                    url: pr.url,
                    ...outcome,
                });
            } catch (error) {
                results.push({
                    repo: pr.repo,
                    number: pr.number,
                    title: pr.title,
                    url: pr.url,
                    success: false,
                    message: error.message,
                });
            }
        }
    }
    const workers = Array.from({ length: Math.min(concurrency, ready.length) }, runNext);
    await Promise.all(workers);

    return {
        attempted: ready.length,
        merged: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
    };
}
