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
