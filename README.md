# .github
Organization profile and reusable workflows

## 📚 Available Reusable Workflows

This repository contains shared workflows that can be used across all `devops-actions` repositories:

### 🚀 Release Automation
**Workflow**: `time-for-new-release.yml`  
**Purpose**: Automatically detect when it's time to release a new version and create a detailed issue

**Features**:
- Detects commits since last release
- Generates categorized changelog
- Creates GitHub issues with release information
- Generates SBOM files for security
- Supports configurable commit thresholds

📖 **Documentation**: [Release Automation Guide](./docs/RELEASE-AUTOMATION.md)  
⚡ **Quick Start**: [5-Minute Setup](./docs/RELEASE-AUTOMATION-QUICKSTART.md)

### 🏷️ Issue/PR Tagging
**Workflow**: `issue-pr-tag.yml`  
**Purpose**: Automatically tag team members in issues or pull requests

### 🔍 OpenSSF Scorecard
**Workflow**: `rw-ossf-scorecard.yml`  
**Purpose**: Run security scorecards on repositories

### ✅ Dependency Review
**Workflow**: `dependency-review.yml`  
**Purpose**: Review dependency changes in pull requests

### 🤖 Dependabot Auto-Approve
**Workflow**: `approve-dependabot-pr.yml`  
**Purpose**: Automatically approve Dependabot PRs

### 🔎 Action Linting
**Workflow**: `actionlint.yml`  
**Purpose**: Lint GitHub Actions workflow files

### 📦 Actions Dependencies
**Workflow**: `actions-dependencies.yml`  
**Purpose**: Track and manage action dependencies

## 🤝 Contributing

To add or modify reusable workflows:
1. Create/edit the workflow in `.github/workflows/`
2. Add appropriate documentation
3. Update this README
4. Test in a repository before rolling out

## 📄 License

See [LICENSE.md](LICENSE.md)

## 🔒 OpenSSF Scorecard

Security posture for all DevOps-Actions repositories:

<!-- OSSF-SCORECARD-START -->
|Repo|Score|
|---|---|
|[action-get-tag](https://github.com/devops-actions/action-get-tag)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/action-get-tag/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/action-get-tag)|
|[actionlint](https://github.com/devops-actions/actionlint)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/actionlint/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/actionlint)|
|[azure-appservice-settings](https://github.com/devops-actions/azure-appservice-settings)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/azure-appservice-settings/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/azure-appservice-settings)|
|[github-copilot-pr-analysis](https://github.com/devops-actions/github-copilot-pr-analysis)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/github-copilot-pr-analysis/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/github-copilot-pr-analysis)|
|[issue-comment-tag](https://github.com/devops-actions/issue-comment-tag)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/issue-comment-tag/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/issue-comment-tag)|
|[json-to-file](https://github.com/devops-actions/json-to-file)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/json-to-file/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/json-to-file)|
|[load-available-actions](https://github.com/devops-actions/load-available-actions)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/load-available-actions/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/load-available-actions)|
|[load-runner-info](https://github.com/devops-actions/load-runner-info)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/load-runner-info/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/load-runner-info)|
|[load-used-actions](https://github.com/devops-actions/load-used-actions)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/load-used-actions/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/load-used-actions)|
|[variable-substitution](https://github.com/devops-actions/variable-substitution)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/variable-substitution/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/variable-substitution)|
|[action-template](https://github.com/devops-actions/action-template)|[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/devops-actions/action-template/badge)](https://api.securityscorecards.dev/projects/github.com/devops-actions/action-template)|
<!-- OSSF-SCORECARD-END -->
