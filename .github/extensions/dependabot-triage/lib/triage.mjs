// triage.mjs — classifies a PR's checks and merge state into a triage status.

const PASS_CONCLUSIONS = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
const FAIL_CONCLUSIONS = new Set(["FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE"]);

/** Classify one raw statusCheckRollup entry as "pass" | "fail" | "pending". */
function classifyCheck(check) {
    // Some rollup entries are plain "StatusContext" (external status API) and
    // use `state` instead of `status`/`conclusion` — handle both shapes.
    const conclusion = (check.conclusion || check.state || "").toUpperCase();
    const status = (check.status || "").toUpperCase();

    if (status && status !== "COMPLETED") return "pending";
    if (!conclusion) return "pending";
    if (PASS_CONCLUSIONS.has(conclusion)) return "pass";
    if (FAIL_CONCLUSIONS.has(conclusion)) return "fail";
    // Unrecognized conclusion (e.g. "SUCCESS"-like custom states) — treat
    // anything not explicitly a known failure as pending to be safe.
    return conclusion === "SUCCESS" ? "pass" : "pending";
}

/**
 * Reduce a PR's raw statusCheckRollup (which can contain duplicate entries
 * for matrix jobs) into one row per unique check name, keeping the worst
 * outcome (fail > pending > pass) across duplicates.
 */
function dedupeChecks(rollup) {
    const rank = { fail: 2, pending: 1, pass: 0 };
    const byName = new Map();
    for (const raw of rollup || []) {
        const name = raw.name || raw.context || "(unnamed check)";
        const outcome = classifyCheck(raw);
        const existing = byName.get(name);
        if (!existing || rank[outcome] > rank[existing.outcome]) {
            byName.set(name, { name, outcome, detailsUrl: raw.detailsUrl || raw.targetUrl || null, workflowName: raw.workflowName || null });
        }
    }
    return [...byName.values()];
}

/**
 * Build the full triage record for one PR.
 * @param {object} pr - raw PR object from `gh pr list`
 * @param {Set<string>|null} requiredChecks - required check names, or null if unknown
 */
export function triagePR(pr, requiredChecks) {
    const checks = dedupeChecks(pr.statusCheckRollup).map((c) => ({
        ...c,
        required: requiredChecks === null ? "unknown" : requiredChecks.has(c.name),
    }));

    const failing = checks.filter((c) => c.outcome === "fail");
    const pending = checks.filter((c) => c.outcome === "pending");
    const requiredFailing = failing.filter((c) => c.required === true);
    const requiredPending = pending.filter((c) => c.required === true);
    const nonRequiredFailing = failing.filter((c) => c.required !== true);

    let status;
    let statusDetail;
    if (pr.isDraft) {
        status = "draft";
        statusDetail = "Draft PR — not evaluated for merge.";
    } else if (requiredFailing.length > 0) {
        status = "blocked-required";
        statusDetail = `Required check${requiredFailing.length > 1 ? "s" : ""} failing: ${requiredFailing
            .map((c) => c.name)
            .join(", ")}`;
    } else if (requiredPending.length > 0) {
        status = "pending";
        statusDetail = `Waiting on required check${requiredPending.length > 1 ? "s" : ""}: ${requiredPending
            .map((c) => c.name)
            .join(", ")}`;
    } else if (nonRequiredFailing.length > 0) {
        status = "blocked-non-required";
        statusDetail = `Non-required check${nonRequiredFailing.length > 1 ? "s" : ""} failing: ${nonRequiredFailing
            .map((c) => c.name)
            .join(", ")}`;
    } else if (pending.length > 0) {
        status = "pending";
        statusDetail = `Waiting on: ${pending.map((c) => c.name).join(", ")}`;
    } else if (pr.mergeStateStatus === "CLEAN") {
        status = "ready";
        statusDetail = "All checks passing and mergeable.";
    } else if (pr.mergeStateStatus === "BEHIND") {
        status = "blocked-non-required";
        statusDetail = "Branch is behind base — needs update.";
    } else if (pr.mergeStateStatus === "BLOCKED") {
        status = "blocked-non-required";
        statusDetail = "Blocked by branch protection (e.g. review required).";
    } else if (pr.mergeStateStatus === "DIRTY") {
        status = "blocked-non-required";
        statusDetail = "Merge conflicts must be resolved.";
    } else if (pr.mergeStateStatus === "UNSTABLE") {
        status = "blocked-non-required";
        statusDetail = "Unstable merge state.";
    } else {
        status = "pending";
        statusDetail = `Merge state: ${pr.mergeStateStatus || "unknown"}`;
    }

    return {
        number: pr.number,
        title: pr.title,
        url: pr.url,
        headRefName: pr.headRefName,
        baseRefName: pr.baseRefName,
        isDraft: pr.isDraft,
        mergeStateStatus: pr.mergeStateStatus,
        checks,
        status, // "ready" | "blocked-required" | "blocked-non-required" | "pending" | "draft"
        statusDetail,
    };
}

export const STATUS_LABELS = {
    ready: "Ready to merge",
    "blocked-required": "Blocked — required check failing",
    "blocked-non-required": "Blocked — non-required check failing",
    pending: "Pending",
    draft: "Draft",
};
