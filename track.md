# Pilot booking flow implementation

Spec: `.ai/specs/2026-10-26-pilot-booking-flow.md`

## Working agreement

- Implement one task at a time; each implementation task is assigned to a subagent.
- Verify and commit each task before marking it complete.
- Stop after each phase so the requester can manually test before the next phase.
- The E01 phases depend on the pilot primitives spec (Phases 1–4) being merged first.
- Phase 1 code is gated on founder A recording D24. Do not author that decision on their behalf.
- D25 is not required for code, but automatic decline/expiry refunds remain disabled until founder A records it.
- Do not enable live payments; the rehearsal and other go-live gates must pass first.

## Preparation

- [x] Read the E01 spec and break it into implementation-sized tasks.

## Prerequisite — Pilot primitives

The E01 spec requires Phases 1–4 of `.ai/specs/2026-10-26-pilot-primitives.md` to be implemented first.

### Phase P1 — Workflow core

- [x] P1.1 Add the pure state machine and unit tests for legal transitions and actor rules.
- [x] P1.2 Add `status_transitions`, a reversible migration, atomic `transitionStatus`, and DB exports; prove concurrent transitions are race-safe.
- Verification note: the DB integration suite is implemented but could not run here because PostgreSQL password authentication failed; run it against the configured test database before the P1 manual test gate.
- [x] P1.3 Extend logger redaction for `question` and `body`, with regression coverage.

**Manual test gate:** ⚠️ not passed: the requester asked to continue despite the PostgreSQL authentication failure. The DB integration suite remains unverified; rerun `npm run test:integration -- --runTestsByPath packages/db/src/repositories/repositories.integration.test.ts` against the configured `devmentor_test` database and confirm migration up/down, concurrent transition handling, and transaction rollback when credentials are available.

**Automated phase checks:** `npm test` (65 suites / 451 tests) and `npm run build` passed. `npm run lint` passed with 11,720 warnings from the pre-existing untracked `packages/ui/.storybook/public/` content. The DB integration command is blocked by PostgreSQL password authentication in this environment.

### Phase P2 — HTTP and auth primitives

- [x] P2.1 Add `Clock`, `OPERATOR_USER_IDS`, `requireOperator`, `assertParticipant`, and resolver-based `requirePilotMember`; extend tests.
- [ ] P2.2 Add `makeActionRoute` and tests for validation, CSRF, session, and handler behavior.
- [ ] P2.3 Add `makeWebhookRoute` and tests for raw-body signature verification and generic bad-signature response.

**Manual test gate:** verify the route behavior and existing CRUD/auth flows remain unchanged.

### Phase P3 — Ports and services

- [ ] P3.1 Add `PaymentGateway` and mock adapter; provide adapter contract tests.
- [ ] P3.2 Add `Mailer`, console adapter, mail event subscriber, and failure-isolation tests.
- [ ] P3.3 Add approval entity/migration and `ApprovalService`; register dependencies and test operator-only, single-use decisions.

**Manual test gate:** verify mock payments, non-fatal mail failures, and approval lifecycle behavior.

### Phase P4 — Frontend primitives

- [ ] P4.1 Add `usePolling`, including hidden-tab pause, visibility refresh, error backoff, and terminal stop.
- [ ] P4.2 Add `StatusBadge` and `ActionButton`, then showcase all states on `ui-preview`.

**Manual test gate:** manually exercise the UI preview, action errors/retry, and polling visibility/terminal behavior.

## Phase 1 — Sign-in (#10)

- [x] 1.1 Record D24 by founder A and update the product brief.
- [ ] 1.2 Add invitation and login-token entities/migrations, services, env settings, and the pilot-member resolver.
- [ ] 1.3 Add magic-link request/consume routes, rate limiting, and the `PUBLIC_SIGNUP` registration guard.
- [ ] 1.4 Add login/verify pages, HTTP mailer, `pilot:invite` CLI, env documentation, and invite-to-sign-in E2E coverage.

**Manual test gate:** invite a user, request and consume a magic link, verify single-use behavior, and confirm public signup behavior.

## Phase 2 — Find a mentor (#11)

- [ ] 2.1 Add mentor profile entity/migration, repository, and technology-filtering service.
- [ ] 2.2 Add mentor API routes and DTOs; verify membership, listing, and unlisted-link access rules.
- [ ] 2.3 Add mentor list, profile/link, and mentor profile pages; capture booking source.

**Manual test gate:** sign in as a pilot member, browse/filter mentors, open a listed and unlisted profile, and update a mentor profile.

## Phase 3 — Question, price, prepay (#12)

- [ ] 3.1 Add booking/payment entities, migrations, and state machines.
- [ ] 3.2 Implement booking creation, server-priced checkout, and attribution handling.
- [ ] 3.3 Add payment webhook handling with amount validation and idempotent transitions.
- [ ] 3.4 Add the Stripe Checkout adapter and payment-mode wiring; validate against gateway contract tests.
- [ ] 3.5 Add payment reconciliation, booking/return pages, polling, and mock-payment E2E coverage.

**Manual test gate:** create a booking, inspect the displayed price and attribution, complete mock checkout, and verify failed/abandoned payments are not visible as paid bookings.

## Phase 4 — Accept, decline, refund (#13)

- [ ] 4.1 Add the accepted-booking overlap constraint and database conflict mapping; implement accept/decline actions and mentor booking UI/email.
- [ ] 4.2 Implement decline/expiry approvals, lazy settlement, `bookings:settle`, and operator-initiated refund requests.
- [ ] 4.3 Implement retry-safe refund execution, operator approvals UI, and refund status DTO behavior.

**Manual test gate:** accept/decline bookings, reject overlapping sessions, exercise expiry and both refund approval paths, and verify retry safety. Do not enable live payments.

## Phase 5 — Text session (#14)

- [ ] 5.1 Add message entity/migration and participant-scoped, time-windowed message service.
- [ ] 5.2 Add message routes and polling session page; verify read-only behavior after the session ends.

**Manual test gate:** test both participant roles, non-participant denial, message polling, and the 25-minute session window.

## Phase 6 — Rehearsal before go-live (manual precondition)

- [ ] 6.1 Run the full rehearsal in the target environment with Stripe test keys and a real mail provider.
- [ ] 6.2 Record evidence, outcomes, and failures in `.ai/runs/2026-11-xx-pilot-rehearsal.md`; rerun failures before proceeding.
- [ ] 6.3 Founder A reviews the rehearsal and required decisions/reviews, then makes the go-live decision.

## Current gates

- Pilot primitives spec Phases 1–4 are not present in the current source tree; E01 implementation is blocked until they are merged.
- D24 (invitation-based e-mail magic link) was confirmed by founder A and recorded in the decision log and product brief.
- D25, operator bootstrap, E03-T02, E03-S01, mentor interviews (D20), and the rehearsal remain explicit operational gates.
