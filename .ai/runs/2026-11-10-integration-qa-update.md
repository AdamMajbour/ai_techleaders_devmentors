
## Local integration and QA — 2026-11-10

- Resolved the local PostgreSQL authentication issue by using the existing PostgreSQL 17 service on port 5433 and an isolated `devmentor_test` database. No secrets were copied into repository artifacts.
- `npm run test:integration -- --runInBand --silent`: **49/49 passed**. Coverage includes booking slot reservation/release, vault schema and generation leases, mentor preview/approval ledger credit, withdrawn-consent rejection, and identity-map synchronization.
- `npm run test:e2e -- --runInBand`: **33/33 passed** against dedicated `devmentor_e2e`. Exercises slot booking, mock purchase, mentor preview, approval and answer release. E2E now cleans only its dedicated schema before/after the run.
- `npm test -- --runInBand`: **119 suites / 782 tests passed**.
- `npm --workspace=@devmentor/ui run test:stories:jsdom`: **323/323 passed**.
- `npm run type-check`, `npm run lint` (5 existing warnings), `npm run build`, and `npm run check:agents`: passed.
- Local UI evidence and screenshots: `.ai/qa/artifacts_e02-local/report.md`; reusable environment: `.ai/qa/test-env.json` at `http://localhost:3001`. Configured `agent-browser` unavailable under native Windows; used repository Playwright 1.64.1 / Chromium 1248 fallback.
- Newly corrected issues found while running the browser flow: vault checkout was not navigated to on successful submit; Awilix proxy injection bindings for availability/vault services were invalid; repository native note writes left managed entities stale. Fixes and regression coverage are on PR #32's worktree.
- **Open gates:** D20 interviews, D26 refund/veto policy, verified entity and qualified E03-T02 review, named live operator, staging settlement scheduler, full Phase 5 real-mail staging rehearsal, synthetic-only Anthropic rehearsal, independent PR review, and explicit live flip. Local mock QA does not satisfy these gates; production settings remain fail-closed.
- **Next action:** continue PR #32 review and stack lifecycle; do not mark the spec implemented or enable live flags until the listed owner/legal/staging evidence is recorded.

Detailed product/legal gate register: `.ai/runs/2026-11-10-vault-product-legal-gates.md`.

## Recheck — 2026-11-12

- Re-ran the configured validation gate on `feat/e02-remaining-vault-slots`: type-check, lint, `check:agents`, unit tests (119 suites / 782 tests), and production build passed. Lint reports the same five warnings in unrelated existing files.
- Re-ran `npm run test:integration -- --runInBand --silent`: **49/49 passed**.
- Re-ran `npm run test:e2e -- --runInBand`: all **33/33 passed**, but Jest reported one open timeout left by the browser setup's redundant `Promise.race` timer. Removed that timer and relied on Playwright's built-in launch timeout; `npm run test:e2e -- --runInBand --detectOpenHandles` then passed **33/33**, exited with code 0, and reported no open handles.
- This initial rerun was local and used mock payments/AI. It did not close the owner, legal, staging, or live-flip gates.

## Owner records — 2026-11-12

- Recorded D26 from the founder A decision supplied by the requester: vault refunds need operator approval; a silent preview expires after 120 minutes and creates a refund request; no more than three distinct mentors are cited; only `released` answers count toward D08. The existing Q4 rule (all cited mentors approve; one rejection stops release) remains in force.
- The requester supplied one Mentor A summary for D20. It is recorded with provenance limits; interviewer/scope confirmation is still pending. No other mentor's acceptance is inferred.
- Restricted `REFUND_AUTO_APPROVE_REASONS` to booking reasons, so vault refunds cannot be auto-approved through environment configuration. The environment-schema regression test and full validation gate pass.
- Legal and staging work were deferred at the requester's direction. They remain launch blockers; live payment/AI/publication flags stay closed.
