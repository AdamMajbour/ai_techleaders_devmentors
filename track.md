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
- [x] P2.2 Add `makeActionRoute` and tests for validation, CSRF, session, and handler behavior.
- [x] P2.3 Add `makeWebhookRoute` and tests for raw-body signature verification and generic bad-signature response.

**Manual test gate:** ✅ requester accepted the automated route/auth/CRUD tests as the P2 phase gate on 2026-11-05. Interactive browser/manual verification remains available later with consuming routes.

### Phase P3 — Ports and services

- [x] P3.1 Add `PaymentGateway` and mock adapter; provide adapter contract tests.
- [x] P3.2 Add `Mailer`, console adapter, mail event subscriber, and failure-isolation tests.
- [x] P3.3 Add approval entity/migration and `ApprovalService`; register dependencies and test operator-only, single-use decisions.
- Verification note: approval migration/repository integration coverage is present, but not verified against PostgreSQL because the configured database rejects authentication for `postgres`.

**Manual test gate:** ✅ requester accepted the automated P3 checks as the phase gate. The approval migration/repository integration coverage remains unverified because PostgreSQL authentication failed in this environment.

**Automated phase checks:** `npm test` (71 suites / 489 tests) and `npm run build` passed. `npm run lint` passed with 11,720 warnings from the pre-existing untracked Storybook output. The approval DB integration coverage remains unverified because PostgreSQL authentication failed in this environment.

### Phase P4 — Frontend primitives

- [x] P4.1 Add `usePolling`, including hidden-tab pause, visibility refresh, error backoff, and terminal stop.
- [x] P4.2 Add `StatusBadge` and `ActionButton`, then showcase all states on `ui-preview`.

**P4.1 validation:** focused hook tests (13 passed), UI package type-check, and ESLint on the changed hook files passed.

**P4.2 validation:** focused component tests (10 passed), UI/app type-check, changed-file ESLint, Storybook jsdom (319 tests), and the app build passed. Token validation is blocked by pre-existing untracked `.storybook/public/` output; the catalogue check still reports four unrelated legacy exports and the absent generated `storybook-static/index.json`.

**Manual test gate:** ✅ requester accepted the automated P4 checks as the phase gate. Browser/manual verification remains available with a running app at `/ui-preview`.

## Phase 1 — Sign-in (#10)

- [x] 1.1 Record D24 by founder A and update the product brief.
- [x] 1.2 Add invitation and login-token entities/migrations, services, env settings, and the pilot-member resolver.
- [x] 1.3 Add magic-link request/consume routes, rate limiting, and the `PUBLIC_SIGNUP` registration guard.
- [x] 1.4 Add login/verify pages, HTTP mailer, `pilot:invite` CLI, env documentation, and invite-to-sign-in E2E coverage.

**1.2 validation:** full unit suite passed (76 suites / 513 tests), workspace type-check, production build, and repository ESLint passed. The DB integration suite was attempted but could not connect because PostgreSQL password authentication failed for `postgres`; migration, constraints, expiry, and atomic concurrent-consumption integration checks remain unverified until the configured `devmentor_test` credentials work.

**1.3 validation:** `npm test` (77 suites / 528 tests), `npm run type-check`, ESLint on changed files, and `npm run build` passed. Added route/service coverage for response parity, validation/CSRF/rate limits, first and repeat sign-in, revoked/expired/reused links, and both registration-guard states. The PostgreSQL integration suite was not rerun; its 1.2 verification blocker remains above. Follow-up: request links use the lazily required, validated `APP_BASE_URL` rather than request host data; its deployment setup is documented in task 1.4.

**1.4 validation:** `npm run pilot:invite -- --help`, workspace type-check, focused ESLint, full `npm test` (78 suites / 539 tests), and `npm run build` passed. Invite-to-sign-in E2E coverage was added and attempted with the dedicated `devmentor_e2e` database; it is blocked before migration/test execution by PostgreSQL password authentication (`28P01`). No development database was used. HTTP mailer/configuration and invitation-list service tests pass.

**Manual test gate:** ✅ requester accepted the automated Phase 1 checks as the phase gate. E2E coverage is present but could not execute because `devmentor_e2e` rejected the configured PostgreSQL password (`28P01`); browser/manual verification remains available after DB access is restored.

## Phase 2 — Find a mentor (#11)

- [x] 2.1 Add mentor profile entity/migration, repository, and technology-filtering service.
- [x] 2.2 Add mentor API routes and DTOs; verify membership, listing, and unlisted-link access rules.
- [x] 2.3 Add mentor list, profile/link, and mentor profile pages; capture booking source.

**2.1 validation:** focused mentor/InvitationService/DI tests passed (15 tests); full unit suite passed (79 suites / 546 tests); workspace type-check and production build passed. Changed-file ESLint passed. Repository `npm run lint` exited 0 with 11,720 warnings, predominantly from the pre-existing untracked `packages/ui/.storybook/public/` output. The DB integration suite was attempted but could not connect: PostgreSQL password authentication failed for `postgres`; migration up/down, uniqueness, invitation-role, and repository filter integration checks remain unverified until the configured `devmentor_test` credentials work.

**2.2 validation:** focused mentor API/service/auth tests passed; the full unit suite passed (80 suites / 559 tests); workspace type-check, changed-file ESLint, and production build passed. Mentor reads return DTOs with bucketed activity only; API/DTO tests cover membership concealment, listed/unlisted access, technology filtering, UUID routes, owner/mentor checks, and DTO keys. Sign-in activity updates are best-effort; profile updates always refresh activity. The existing PostgreSQL integration-test credential blocker from 2.1 remains.

**2.3 validation:** focused mentor service/API/page tests passed (5 suites / 30 tests); workspace type-check and production build passed; changed-file ESLint passed. Repository `npm run lint` exited 0 with 11,720 pre-existing warnings from the untracked Storybook output. The UI token checker reports 549 color values from that same untracked `packages/ui/.storybook/public/` output; a focused scan of the new screen files found no palette classes, arbitrary values, or color literals. E2E was not run: the repository harness requires its dedicated `devmentor_e2e` PostgreSQL database, and earlier attempts in this environment failed password authentication (`28P01`). The editor uses a mentor-only self-profile API and leaves update authorization to the service; list and slug reads continue to enforce pilot membership, unlisted profiles are absent from the list but available to pilot members through direct slug reads, and UUID reads remain owner-scoped.

**Manual test gate:** ✅ requester accepted the automated Phase 2 checks as the phase gate. Browser/E2E verification remains available after the `devmentor_e2e` PostgreSQL credentials are restored; DB migration integration checks from 2.1 also remain unverified.

## Phase 3 — Question, price, prepay (#12)

- [x] 3.1 Add booking/payment entities, migrations, and state machines.
- [x] 3.2 Implement booking creation, server-priced checkout, and attribution handling.
- [x] 3.3 Add payment webhook handling with amount validation and idempotent transitions.
- [x] 3.4 Add the Stripe Checkout adapter and payment-mode wiring; validate against gateway contract tests.
- [x] 3.5 Add payment reconciliation, booking/return pages, polling, and mock-payment E2E coverage.

**3.1 validation:** booking/payment state-machine tests passed (2 suites / 6 tests); full unit suite passed (85 suites / 577 tests); workspace type-check, changed-file ESLint, repository lint, and production build passed. Repository lint reported 11,720 warnings, largely from the existing untracked `packages/ui/.storybook/public/` output. DB migration/constraint integration coverage was added and attempted, but could not execute because PostgreSQL password authentication failed for `postgres`; migration up/down and schema constraints remain unverified until `devmentor_test` credentials work.

**3.2 validation:** focused booking/event tests passed (2 suites / 18 tests) before the checkout-failure follow-up; the follow-up booking-service suite passed (14 tests), including coverage that both gateway and persistence errors are surfaced. The full unit suite passed (86 suites / 590 tests) before that follow-up; core type-check and changed-file ESLint passed afterward. Full-repository lint and production build passed before the follow-up. Repository lint still reports warnings from the existing untracked `packages/ui/.storybook/public/` output. DB integration was not run: PostgreSQL authentication is known to fail in this environment, and no development database was used.

**3.3 validation:** focused webhook/service/event/DI tests passed (4 suites / 23 tests); workspace type-check, production build, repository lint, and changed-file ESLint passed. DB integration coverage was added for atomic paired transitions, mismatches, replay, and terminal ordering, but its run is blocked before test setup because PostgreSQL rejects the configured `postgres` password (`28P01`).

**3.4 validation:** focused payment adapter/config/DI/webhook/booking tests passed (7 suites / 62 tests); workspace type-check, repository lint (`npm run lint -- --quiet`), and production build passed. Stripe contract tests use a mocked SDK client and SDK-generated local signature fixtures; no live payment requests or secrets were used. No database or E2E tests were run. At that point, reconciliation/pages (3.5) and the Phase 3 manual test gate remained pending.

**3.5 validation:** focused booking, API, payment adapter, mock-payment, and mentor-page tests passed (7 suites / 54 tests); the full unit suite passed (91 suites / 633 tests), UI Storybook jsdom tests passed (319 tests), and workspace type-check, repository lint (`npm run lint -- --quiet`), production build, and `git diff --check` passed. E2E and DB integration tests were attempted but stopped before assertions because PostgreSQL rejected the configured `postgres` password (`28P01`); E2E uses the dedicated `devmentor_e2e` database guard, and no development database was used. Mock-payment tests use the mock gateway; no live payment mode or Stripe requests were used.

**Manual test gate:** ✅ requester accepted the automated Phase 3 checks as the phase gate. E2E and DB integration coverage remains unverified because PostgreSQL authentication failed (`28P01`); live payments remain disabled.

## Phase 4 — Accept, decline, refund (#13)

- [x] 4.1 Add the accepted-booking overlap constraint and database conflict mapping; implement accept/decline actions and mentor booking UI/email.
- [x] 4.2 Implement decline/expiry approvals, lazy settlement, `bookings:settle`, and operator-initiated refund requests.
- [ ] 4.3 Implement retry-safe refund execution, operator approvals UI, and refund status DTO behavior.

**4.1 validation:** focused booking, API, mailer/event, and mentor-page checks passed (7 suites / 55 tests); workspace type-check, repository lint (`npm run lint -- --quiet`), production build, and `git diff --check` passed. Added dedicated-test-database integration coverage for migration rollback and sequential/concurrent overlaps, but it could not execute because PostgreSQL rejected the configured `postgres` password (`28P01`). No development database was used.

**4.2 validation:** focused env, booking-service, approval-service, and booking-route tests passed (4 suites / 61 tests); workspace type-check, repository lint (`npm run lint -- --quiet`), production build, `git diff --check`, and `npm run bookings:settle -- --help` passed. Added dedicated DB integration coverage for the response-window boundary, atomic idempotent expiry, and refund-approval uniqueness/migration rollback, but the suite is blocked before setup/assertions by PostgreSQL password authentication (`28P01`); no development database was used. `REFUND_AUTO_APPROVE_REASONS` defaults empty and is empty in `.env.example` and deployment guidance; no automatic approvals or refund gateway calls are made. D25 remains unrecorded.

**Manual test gate:** ⏳ pending. Verify accept/decline, overlap rejection, lazy expiry, and operator refund-request authorization after 4.2. Phase 4.3's refund execution, retry safety, operator approvals UI, and refund-status DTO remain pending; approved refunds must not be represented as executed until the real executor is implemented. D25 remains outstanding; do not enable live payments.

## Phase 5 — Text session (#14)

- [ ] 5.1 Add message entity/migration and participant-scoped, time-windowed message service.
- [ ] 5.2 Add message routes and polling session page; verify read-only behavior after the session ends.

**Manual test gate:** test both participant roles, non-participant denial, message polling, and the 25-minute session window.

## Phase 6 — Rehearsal before go-live (manual precondition)

- [ ] 6.1 Run the full rehearsal in the target environment with Stripe test keys and a real mail provider.
- [ ] 6.2 Record evidence, outcomes, and failures in `.ai/runs/2026-11-xx-pilot-rehearsal.md`; rerun failures before proceeding.
- [ ] 6.3 Founder A reviews the rehearsal and required decisions/reviews, then makes the go-live decision.

## Current gates

- Pilot primitives P1–P4 are implemented and accepted; their DB integration checks remain subject to the PostgreSQL authentication limitation recorded above.
- D24 (invitation-based e-mail magic link) was confirmed by founder A and recorded in the decision log and product brief.
- D25, operator bootstrap, E03-T02, E03-S01, mentor interviews (D20), and the rehearsal remain explicit operational gates.
