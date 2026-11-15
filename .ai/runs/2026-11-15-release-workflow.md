# Release workflow execution plan

- Goal: Add a manually triggered GitHub Actions release workflow that selects the next semantic version, updates every workspace package version, tags the release, and publishes notes from CHANGELOG.md.
- Scope: `.github/workflows/`, root and workspace `package.json` files, `CHANGELOG.md` integration, and this run record.
- Non-goals: Automated releases on merge, dependency version changes, deployment, and changelog authoring.
- Risks: Manual dispatch must run from the correct release branch; invalid custom versions or missing changelog entries must fail before publishing. Full review is pending because lint fails in an unrelated seed script; the PR stays draft. The PR base is the current release line `local/v1.0.1`, whose history descends from configured default `main`.

## Implementation Plan

### Phase 1: Build release workflow

1.1 Add workflow dispatch inputs, SemVer selection and validation, package version updates, changelog extraction, tag creation, and GitHub Release publication.
1.2 Review the diff and run the configured validation gate.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append `— <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Build release workflow

- [x] 1.1 Add workflow dispatch inputs, SemVer selection and validation, package version updates, changelog extraction, tag creation, and GitHub Release publication. — 75cd4ba101268da203c6b0eeb4170aa9830b0d6c
- [x] 1.2 Review the diff and run the configured validation gate. — 50ed6b3 plus final validation below


