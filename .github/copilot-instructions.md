# Copilot instructions

## What this repository is
Community-health `.github` repository for the **devops-actions** organization. It contains:
- The organization profile (`profile/README.md`) shown on the org page.
- Shared / reusable GitHub Actions workflows used by the action repos in the org (`.github/workflows/`).
- Org-wide community files (`LICENSE.md`, `.github/SECURITY.md`, `.github/FUNDING.yml`, `.github/CONTRIBUTING`).
- A custom agent definition (`agents/repostatus.agent.md`).
- Helper scripts (`.github/scripts/`) and OpenSSF Scorecard reporting data (`ossf-reporting/`).

## Repository structure
- `.github/workflows/` — reusable workflows (callable via `workflow_call`) and org-level automation:
  - `approve-dependabot-pr.yml` — verifies, approves and enables auto-merge for Dependabot PRs (semver minor/patch).
  - `actions-example-checker.yml` — validates README action examples against `action.yml` schemas in calling repos.
  - `time-for-new-release.yml` — release automation (changelog issue + SBOM).
  - `rw-ossf-scorecard.yml`, `openssf-scorecard-monitor.yml` — OpenSSF Scorecard runs and reporting.
  - `dependency-review.yml`, `actionlint.yml`, `secure-inputs.yml`, `validate-npm-token.yml`, `issue-pr-tag.yml`, `actions-dependencies.yml`, `update-scope.yml`.
- `profile/README.md` — public org profile; keep it in sync when workflows change.
- `README.md` (root) — documents the reusable workflows; update it when adding/removing one.
- Root `copilot-instructions.md` — instructions for the multi-repo devops-actions workspace (a different file from this one; do not confuse them).

## Workflow conventions
- **SHA-pin every action** to a full commit SHA, with the version as a trailing comment, e.g. `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`.
- **First step of every job** is `step-security/harden-runner` with `egress-policy: audit`.
- **Minimal permissions**: set top-level `permissions: contents: read` (or less) and grant additional scopes per job only where needed.
- Reusable workflows are consumed by action repos via small caller files, e.g. `uses: devops-actions/.github/.github/workflows/actions-example-checker.yml@main`. Reusable workflows targeting other repos must include `workflow_call` in `on:`.
- Commits must be **signed** — never bypass GPG signing.

## CI / release flow
- Dependabot PRs for GitHub Actions and npm are auto-approved and auto-merged by `approve-dependabot-pr.yml` after verifying every commit on the PR is authored by `dependabot[bot]`; only semver minor/patch updates are merged automatically.
- New releases of the action repos are prepared through `time-for-new-release.yml`, which opens a release issue with a categorized changelog and SBOM.
- Linting of workflows in this repo happens through `actionlint.yml` — run/check workflows before merging.

## Contribution guidelines
- Per `.github/CONTRIBUTING`: create an issue before opening a pull request.
- Keep changes small and consistent with existing workflow style; update `README.md` and `profile/README.md` when user-facing behavior changes.
