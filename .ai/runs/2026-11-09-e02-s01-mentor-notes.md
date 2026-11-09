# E02-S01 mentor notes — 2026-11-09

## Goal
Implement E02-S01: invited mentors can create and manage private notes, publish only after fresh consent to the versioned AI-use notice, and take published notes down. The implementation ships as a PR based on `develop`, as requested by the repository owner for this run.

## Scope
- Notes entity/table with published-consent database invariant; repository and state transitions.
- Owner-scoped note service and CRUD/publish/take-down API, backed by the existing invitation role and session.
- Shared note/publish schemas and mentor notes list/detail pages using the existing Storybook `NoteEditor`, `PublishNoticePanel`, `MarkdownView`, and action patterns.
- Tests for consent, status, ownership, notice version, take-down, and UI ordering.
- Link implementation to Epic #8 and story #15. Story #17 (purchase/generation) is outside E02-S01; primitives 2 still lacks the AI port, ledger, and settlement on `develop`.

## Non-goals
- Vault purchases, AI generation, previews, refunds, ledger credits, or seeker-facing vault routes.
- Taking down notes cancelling pending answers (there are no vault answers in this story slice); preserve already released answer snapshots per the spec.
- Recording D20 interviews or E03 notice review; publishing remains gated in production by `VAULT_PUBLISH_ENABLED`.

## Risks
- User data and consent are persisted; verify owner isolation and the DB constraint with integration coverage.
- `VAULT_PUBLISH_ENABLED` defaults closed in production until E03-T02 is recorded. Never record secret values.
- E02 purchase/generation cannot ship as part of this story until primitives 2 is implemented.
- `npm run test:integration` could not connect to the local test database (default PostgreSQL authentication failed for `postgres`). The test suite includes migration up/down and owner-isolation coverage, but this risk-heavy database evidence remains unverified until it runs with the repository test DB environment.

## Source doc
`.ai/specs/2026-10-27-pilot-vault-answers.md`

## Validation
- `npm run type-check` — passed.
- `npm run lint` — passed with five existing warnings outside this change.
- `npm run check:agents` — passed.
- `npm test -- --runInBand` — passed (105 suites, 722 tests).
- `npm run build` — passed.
- `npm run test:integration` — blocked before tests: local PostgreSQL password authentication failed for `postgres`; the environment file was not copied into the worktree. Migration and owner-isolation integration coverage is present but unverified.

## Progress
PR: #29

> Convention: `- [ ]` pending, `- [x]` done. Append `— <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Notes (E02-S01, #15)

- [x] 1.1 Add the notes entity, consent constraint, migration, repository, state rules, and notice constants — bcd77ab
- [x] 1.2 Implement owner-scoped note service and CRUD, publish, and take-down routes — 4101b28
- [x] 1.3 Add shared validators and unit/integration coverage for consent, ownership, and state transitions — 7993757
- [x] 1.4 Build mentor notes pages from Storybook patterns and verify the full validation gate — fad1509


