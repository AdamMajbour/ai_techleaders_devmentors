
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
