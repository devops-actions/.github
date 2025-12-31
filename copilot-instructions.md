## Workspace Overview
- Multi-repo VS Code workspace rooted at `devops-actions` which is also an organization at GitHub; treat each folder as an individual GitHub Action project as it is a repository on its own.
- All projects belong to the `devops-actions` org and reuse centralized reusable workflows stored in the `.github` repository in this workspace.

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