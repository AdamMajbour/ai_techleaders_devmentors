# Release workflow execution plan

- Goal: Add a manually triggered GitHub Actions release workflow that selects the next semantic version, updates every workspace package version, tags the release, and publishes notes from CHANGELOG.md.
- Scope: `.github/workflows/`, root and workspace `package.json` files, `CHANGELOG.md` integration, and this run record.
- Non-goals: Automated releases on merge, dependency version changes, deployment, and changelog authoring.
- Risks: Dispatch requires a dated, non-empty changelog entry for the selected version. GitHub Actions CI and the authoritative review must pass before the PR can be marked complete.

## Implementation Plan

### Phase 1: Build release workflow

1.1 Add workflow dispatch inputs, SemVer selection and validation, package version updates, changelog extraction, tag creation, and GitHub Release publication.
1.2 Review the diff and run the configured validation gate.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `— <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Build release workflow

- [x] 1.1 Add workflow dispatch inputs, SemVer selection and validation, package version updates, changelog extraction, tag creation, and GitHub Release publication. — 598d597a9b22fab9d8fca65e55a2c334d45d47cb
- [x] 1.2 Review the diff and run the configured validation gate. — ac72afe846d47827d107ab785841360e86fffd1f
- [x] Resume fix: use const for the seeded message. — 62c3506e11a0e8f3607516d936f4592e1b0f543a
- [x] Resume CI fix: remove redundant missing npm script invocation. — 8f1902c1b6eca128abdb4cac5f4a5b117adb213b