Please disclose any issues responsibly by using the [private vulnerability reporting option](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) from GitHub or emailing them to raj.bos+github_security@gmail.com.

I'm happy to have a look into it!

## Verifying releases

Releases of the actions in this organization carry [artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations) and SPDX/CycloneDX SBOMs. Every release asset (the source archive, `action.yml`, the files the action runs from and the SBOMs) has a build provenance attestation, signed by the shared [release workflow](https://github.com/devops-actions/.github/blob/main/.github/workflows/rw-release-attestation.yml). Verify a downloaded file, or the file in your runner's action cache, with:

```shell
gh attestation verify <file> --repo devops-actions/<repo> \
  --signer-workflow devops-actions/.github/.github/workflows/rw-release-attestation.yml
```
