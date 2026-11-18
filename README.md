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

### 🔏 Release with SBOM and attestations
**Workflow**: `rw-release-attestation.yml`  
**Purpose**: Publish an action's GitHub release with SBOMs and [artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations)

**Features**:
- Runs on the pushed tag; creates the release as a draft, uploads the files, verifies them and then publishes (works with immutable releases)
- Attaches a `git archive` of the tag, `action.yml` and the files the action runs from (`runs.main`/`pre`/`post` or the `Dockerfile`)
- Attaches SPDX and CycloneDX SBOMs (Syft) of the tagged source
- Build provenance attestation for every asset, SBOM attestation for the archive and action files
- Verifies all attestations, and the downloaded release assets, before publishing

**Usage** (in a workflow triggered by `push: tags: ['v*']`):
```yaml
jobs:
  release:
    permissions:
      contents: write       # create the release and upload its assets
      id-token: write       # Sigstore keyless signing for the attestations
      attestations: write   # store the attestations
    uses: devops-actions/.github/.github/workflows/rw-release-attestation.yml@<sha> # main
    # with:
    #   extra-files: |       # optional extra committed files to attach and attest
    #     dist/licenses.txt
```

**Verifying a release file** (the signer is this reusable workflow, so pass `--signer-workflow`):
```shell
gh attestation verify <file> --repo devops-actions/<repo> \
  --signer-workflow devops-actions/.github/.github/workflows/rw-release-attestation.yml
```

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
