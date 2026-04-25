## Workspace Overview
- Multi-repo VS Code workspace rooted at `devops-actions` which is also an organization at GitHub; treat each folder as an individual GitHub Action project as it is a repository on its own.
- All projects belong to the `devops-actions` org and reuse centralized reusable workflows stored in the `.github` repository in this workspace.

Most repositories contain GitHub Actions, which can be checked by looking for a `action.yml` or `action.yaml` file in the root of the repository.

## Authoring Guidance
- Prefer patterns consistent with existing TypeScript and JavaScript GitHub Actions in this workspace.
- When referencing shared CI/CD logic, point to the reusable workflow definitions under `.github/workflows` in the `.github` repository and assume they are imported by the individual repos.
- Keep documentation contributions concise and align terminology across repos to simplify reuse.
- When making changes, go in and out each repo where needed and run the git commands inside the repo folder
- When asked to update all repos, first list the subfolders (for example with `Get-ChildItem -Directory`) and then run a scripted loop so each repo checks out its main branch and pulls the latest changes:

```
Push-Location "c:\Users\RobBos\code\repos\devops-actions"
foreach ($repo in Get-ChildItem -Directory) {
	Push-Location $repo.FullName
	git fetch --all --prune
	git checkout main
	git pull --ff-only
	Pop-Location
}
Pop-Location
```

## Reusable Workflows

Shared CI/CD workflows live in `.github/.github/workflows/`. Each action repo calls them via a small caller file in its own `.github/workflows/`.

**Currently active reusable workflows:**

| File | Purpose |
|------|---------|
| `actions-example-checker.yml` | Validates action input/output examples in the README against the `action.yml` schema using `jessehouwing/actions-example-checker` |

**Caller file pattern** (identical across all action repos, e.g. `.github/workflows/actions-example-checker.yml`):
```yaml
name: Validate Action Examples
on: [push, pull_request, workflow_dispatch]
permissions:
  contents: read
jobs:
  validate-examples:
    uses: devops-actions/.github/.github/workflows/actions-example-checker.yml@main
    permissions:
      contents: read
```

When adding a new reusable workflow, add it to the `.github` repo first and then add the caller file to every action repo.

## Branch Protection Rulesets

Every action repo has a ruleset named **"Require PR with passing checks"** targeting the default branch (`~DEFAULT_BRANCH`). Rules:

- **pull_request** — PR required before merge; 0 approvals needed (single maintainer); all merge methods allowed.
- **required_status_checks** — repo-specific set of jobs that must pass (see table below); not strict (branch does not need to be up-to-date).
- **deletion** — `main` cannot be deleted.
- **non_fast_forward** — force pushes blocked.
- **bypass** — repository admins can bypass for emergencies.

Required status checks per repo:

| Repo | Required checks |
|------|----------------|
| `action-get-tag` | `test`, `CodeQL-Build`, `actionlint / run-actionlint`, `validate-examples / Validate examples` |
| `actionlint` | `Test with normal setup`, `Test with skip failure set on the action`, `validate-examples / Validate examples` |
| `azure-appservice-settings` | `Build and test job (ubuntu-latest)`, `Build and test job (macos-latest)`, `Build and test job (windows-latest)`, `Analyze (javascript)`, `Analyze (typescript)`, `validate-examples / Validate examples` |
| `github-copilot-pr-analysis` | `validate-examples / Validate examples`, `actionlint / run-actionlint`, `dependency-review / dependency-review` |
| `issue-comment-tag` | `build`, `dependency-check`, `Analyze (javascript)`, `Analyze (typescript)`, `validate-examples / Validate examples` |
| `json-to-file` | `build`, `test`, `check-dist`, `Analyze (TypeScript)`, `validate-examples / Validate examples` |
| `load-available-actions` | `Consolidate`, `validate-examples / Validate examples` |
| `load-runner-info` | `build`, `dependency-check`, `Analyze (actions)`, `Analyze (javascript-typescript)`, `validate-examples / Validate examples` |
| `load-used-actions` | `Run unit tests`, `Run action from branch`, `CodeQL-Build`, `validate-examples / Validate examples` |
| `variable-substitution` | `Build and test job (ubuntu-latest)`, `Build and test job (macos-latest)`, `Build and test job (windows-latest)`, `Execute the local action`, `Analyze (javascript)`, `Analyze (typescript)`, `validate-examples / Validate examples` |

To update a ruleset: `gh api --method PUT "repos/devops-actions/{repo}/rulesets/{id}"` with the modified JSON body.