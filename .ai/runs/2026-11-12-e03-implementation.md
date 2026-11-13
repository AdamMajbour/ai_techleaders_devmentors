# E03 implementation and rehearsal readiness

Date: 2026-11-12
Branch: `feat/e03-pilot-readiness`
Environment: local isolated worktree; Stripe Connect was not called against an external test account.

## Implemented

- Versioned seeker and mentor terms, digest-bound review/acceptance records, exact-version checkout and note-publish consent, and user-visible acceptance history.
- Poland Stripe Express onboarding, test-key-only Connect gateway, single-allocation transfers from non-live released-vault ledger credits, retries with stable idempotency, and per-attempt operator audit rows.
- Operator legal holds with required create/release reasons and actor/timestamp audit; retention batches skip active holds, erase session questions/messages, notes, vault content and citation snapshots, and persist run status/counts.
- Operator metrics split by service, currency and live/test, including refunds, unsuccessful outcomes, mentor credits, test payouts, landing attribution and vault failure rate.

## Test-mode configuration

Set these only in the local/staging environment, using Stripe test credentials:

```dotenv
PAYMENTS_MODE=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_ENABLED=true
PAYMENTS_LIVE_ENABLED=false
```

The Connect adapter rejects live keys. Payout selection only includes ledger entries with `livemode=false`.

## Local verification

- `npm test -- --runInBand`
- `npm run test:stories:jsdom --workspace=@devmentor/ui`
- Type-check for `@devmentor/core`, `@devmentor/db`, `@devmentor/ui`, and `@devmentor/app`
- `git diff --check`

Final local results: Jest 124/124 suites and 795/795 tests passed; UI Vitest 1/1 test file and 323/323 tests passed; all four package type-checks passed; `git diff --check` passed. Vitest is already declared as a UI development dependency. Install dependencies with `npm ci` from the repository root, then run `npm run test:stories:jsdom --workspace=@devmentor/ui`.

## Still requires staging verification

- Apply the pending migrations to an isolated PostgreSQL database and run the integration suite.
- Configure Stripe test credentials, complete a Polish Express onboarding flow, and exercise transfer retry/reconciliation in Stripe test mode.
- Confirm reviewed owner-authored terms and verifier evidence before any production payment or payout decision. Live Connect transfers remain disabled by implementation.

No migration was applied to a shared or production database, and no Stripe account or external service was contacted during local verification.
