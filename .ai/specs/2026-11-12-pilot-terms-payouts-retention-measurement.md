# Pilot terms, payments and measurement (E03): make the pilot safe to pay for, close out and measure

Status: Draft for implementation; human launch gates remain binding. Source: backlog E03 (#9), stories E03-T01–T03 (#18–#20), E03-S01–S03 (#21–#23); design authority `.ai/specs/product-brief.md`. Depends on E01 booking/payment/refund flows and E02 vault answers/credits. This spec does not authorize taking real money or assert legal approval.

## TL;DR

Before a seeker can pay with real money or a mentor can receive a payout, the pilot needs a clear, versioned set of terms, proof of each participant's consent, and a verifier's recorded review. E03 delivers those controls, pays eligible mentor credits through Stripe with an auditable idempotent record, deletes pilot content after the retention deadline, and gives the founder reliable live-pilot counts. Founder A remains the accountable operator; code cannot substitute for the verifier's review or founder A's explicit go-live decision.

## Problem and outcome

E01 and E02 can create paid bookings, vault purchases and mentor credits, but their real-money readiness is explicitly gated on E03. The active decisions require minimal pilot terms (D15), Stripe payments, refunds approved by founder A and EU data rules treated as applicable (D17), the named entity and verifier (D21–D22), an end date and retention window (D18), and a founder-readable measurement at two reviews (D08). The current record says the verifier's review has not happened. A live payment without a durable review and consent record would violate the product's own launch gate.

**Outcome:** an operator can publish reviewed, versioned terms; seekers and mentors accept the applicable version and can later see what they accepted; payment and payout flows fail closed until required gates are recorded; a scheduled retention job deletes in-scope content; and the founder can read reproducible counts with test payments excluded.

## Scope and explicit exclusions

In scope:

- Terms document versions and a human-authored review record, including review of the AI notice and named processors.
- Seeker acceptance at checkout before payment begins, and mentor acceptance before publishing notes or receiving payout.
- A technical live-payment gate that requires recorded verification and a deliberate founder-controlled enablement flag.
- Stripe Connect transfer/payout of eligible E02 ledger credits, with per-credit idempotency, reconciliation state and operator-visible failures.
- A retention sweep for session messages and mentor notes, plus linked questions, answers and citation snapshots, 30 days after 2026-12-14.
- Read-only pilot metrics for the two D08 review dates, counting live money only and separating bookings, vault answers, refunds and test transactions.

Out of scope: writing legal advice or claiming the terms are legally sufficient; public launch terms; automated refunds beyond existing E01/E02 rules; payout of test-mode credits; changing the 80% mentor share or deciding Stripe fees; retention/deletion of account, payment, consent, ledger, audit or legally required financial records; a general analytics platform; changing D08 thresholds or interpreting results on behalf of the founder.

## Roles and permissions

- **Founder A/operator:** authors and publishes terms, records the verifier's outcome, initiates/retries payout batches, inspects reconciliation and reads pilot metrics. Operator means the configured `OPERATOR_USER_IDS` allowlist; no general RBAC is added.
- **Verifier:** a human reviewer identified by founder A. This feature stores the reviewer's identity, timestamp, document version/hash, scope and outcome. It does not authenticate a legal qualification or allow the reviewer to self-approve by merely opening a page.
- **Seeker:** accepts the current seeker terms before checkout; can inspect accepted version and timestamp.
- **Mentor:** accepts mentor terms before note publication and payout eligibility; can inspect accepted version and timestamp.
- All mutations use existing CSRF/origin protections and derive actor identity from the session. Every mutation checks ownership or operator authorization.

## User workflows

### Publish and verify terms

1. Founder A drafts a versioned seeker/mentor terms bundle. Each version is immutable after publication; edits create a new version and digest.
2. The bundle explains the controller/entity as recorded in D21–D22; collected data and purposes; session and note retention; Stripe's role in payment and payout; AI processor use, including that the question and consenting-note corpus are sent for generation; that cited mentors see the question and preview before release during the pilot; refunds; vault pricing and the 80% credit split; contact for data requests; and limits of the pilot.
3. Founder A submits that exact version and the E02 AI notice/processor details for review. An operator records the verifier's identity, date, version/digest, scope (terms, payment handling, notice/processors), and explicit pass/fail. Only a pass for the currently published digest satisfies the gate. A changed digest invalidates the review.
4. Until the current version has a passing review, live payment and production note publishing remain disabled. Test-mode flows remain available with visible test-mode treatment.

### Seeker accepts and pays

1. Checkout shows the current terms version and a required, unchecked acceptance control before redirecting to Stripe. The acceptance identifies actor, terms version/digest, timestamp, and checkout subject (booking or vault answer).
2. The server rejects checkout if the version is missing, stale, unpublished, not reviewed, or acceptance is absent. It stores acceptance before creating the checkout session; a failed checkout leaves an auditable acceptance, not a paid booking.
3. Existing users with no current acceptance must accept at their next checkout. Old acceptance remains immutable. A new terms version requires renewed acceptance.

### Mentor accepts and receives payout

1. A mentor must accept the current mentor terms before publishing a note. Existing published notes stay available under their recorded consent until the mentor accepts a superseding version; publishing or editing that changes consent-sensitive behavior is blocked until acceptance.
2. Stripe Connect onboarding/eligibility state is shown to the mentor without exposing another user's details. No payout is attempted before Stripe confirms the connected account can receive transfers.
3. The operator starts a payout batch from eligible, unpaid, live-mode ledger credits. Eligibility is limited to released vault answers, net of already recorded payout allocations and documented post-release refunds. Session earnings are not included because E01 has no mentor-share rule for sessions.
4. Each credit is allocated once. A stable idempotency key identifies the credit allocation; Stripe transfer ids and outcomes are stored. Retries reconcile the existing transfer before attempting a new one. Partial batch failures remain visible and retryable without re-paying successful rows.
5. The mentor sees total paid, pending and blocked amounts and the source answer/date, never the seeker's question or answer text. Refunds after release continue to follow E02's manual Stripe correction procedure and reduce the next eligible payout with an operator-recorded adjustment; no unsupported automatic clawback is implied.

### Retention and deletion

1. Retention deadline is 2027-01-13 23:59:59 Europe/Warsaw (30 days after the pilot end date 2026-12-14, inclusive reading of D15/D18). Founder A may configure a later deadline only through an auditable policy change; an earlier date is not allowed by this spec.
2. `retention:sweep` runs from the existing settlement/cron mechanism and is safe to repeat. At or after the deadline it hard-deletes message bodies, session text, mentor note bodies, vault questions and generated answer text, and citation snapshots that contain mentor/note display data. It preserves state transitions, aggregate counts, payout/ledger/payment records, consent and review evidence, and non-content foreign-key identifiers needed for accounting and audit.
3. If an in-scope row is under a documented legal hold, the operator records the hold and reason; only that row is skipped and reported. No silent indefinite retention.
4. The run reports rows deleted/skipped by category without logging content. Failure in one category does not falsely mark the whole sweep complete; retry is idempotent.

### Read pilot counts

The operator report is read-only, generated from persisted state and server timestamps, with a selected window and an explicit `livemode=true` filter. It shows:

- unique seekers with a successful live prepaid session booking and unique seekers with a released live vault answer, separately;
- paid, declined/expired/cancelled, refunded and pending counts for sessions and vault answers, separately;
- gross paid amounts, refunds, mentor credits and paid-out totals in EUR, with test-mode amounts in a separate section;
- time from landing to successful live booking when `landed_at` is present, plus missing-attribution count;
- vault unanswerable/failure count and rate among paid live vault purchases;
- cohort/window boundaries, generation timestamp and definitions beside every metric.

The report does not change D08's thresholds or decide whether a criterion passed. It supports the 2026-11-30 and 2026-12-14 reviews; if the feature ships after either date, it can still display historical windows from timestamps but cannot claim that an unrun review occurred.

## Data model and invariants

Add the smallest schema needed, following the existing primitives and package boundaries:

- `terms_versions`: immutable `kind`, `version`, `body`, `sha256`, `published_at`, actor id; unique `(kind, version)` and digest.
- `terms_reviews`: version/digest, reviewer label/id, reviewed scopes, outcome, timestamp, notes reference; append-only. Notes are operator-only and redacted from logs.
- `terms_acceptances`: user id, version/digest, accepted timestamp, role, subject type/id; immutable, indexed by user/kind/time. Duplicate identical acceptance is idempotent.
- `payout_transfers` and allocation rows: Stripe account/transfer ids, source ledger entry, amount/currency, idempotency key, status, livemode, attempts and safe error code; unique source allocation and idempotency key.
- A content retention marker/hold only if required to resume/report the sweep reliably; never copy content into this table.

All money is integer minor units and EUR. Payout totals are derived from immutable ledger credits and immutable payout allocations/adjustments; never mutate or delete ledger entries. Database writes for allocation and state changes use `UnitOfWork`; Stripe calls happen after commit through the existing external settlement task/port. Stripe webhook/reconciliation replay is idempotent. Unknown or mismatched transfer events are recorded and surfaced, not applied to a different mentor.

## API and UI surface

- `GET /api/terms/current?kind=seeker|mentor`: public-to-authenticated participants, version, digest, body and reviewed state; never exposes operator notes.
- Operator routes to create draft, publish, record review and view gate status; require operator role and CSRF.
- `POST /api/terms/accept`: authenticated user accepts exact current version for a supported role and optional checkout subject.
- Checkout routes include required acceptance/version and reject stale state server-side.
- Mentor payout summary and Connect status endpoints expose only the caller's data; operator payout batch, retry and reconciliation endpoints require operator.
- `GET /api/operator/pilot-metrics?from=&to=` and retention run status are operator-only, uncached, and read-only except explicit sweep action.
- UI includes the terms before checkout, mentor acceptance before publish, current review/live-gate status, mentor payout status, operator review/audit controls, metrics and retention outcomes. Use the existing component/design system and English product copy.

## Architecture and security

Keep the four-package direction `app -> core -> db`, UI only through app, and no ORM imports outside `db`. Business rules and gates live in `core`; migrations, entities and aggregate queries live in `db`; route handlers use existing route builders and `apiCall`. No raw app API fetch, no `any`, no CSS-in-JS. Read installed Next.js 16 docs before implementation.

Sensitive content never enters events, logs, metrics, payout metadata or Stripe transfer descriptions. Stripe receives only required financial/account identifiers. Terms acceptances and review evidence are append-only. Every payout and retention operator action is attributed to the session user and emits an id-only audit event. All state-changing routes enforce CSRF and origin checks.

## Acceptance criteria and implementation phases

### Phase 1 — Terms, verifier review and consent

1. Add versioned immutable seeker/mentor terms and digest; seed no fabricated legal prose. Provide editable draft content/configuration and require founder A to supply/publish the reviewed text.
2. Record verifier review against exact digest and scope; changing content invalidates the gate. A failed or missing review keeps production live-payment and note-publishing gates closed.
3. Store seeker acceptance before checkout and mentor acceptance before note publication, with exact version/digest, actor and timestamp. Missing/stale acceptance is rejected by server APIs, not only UI.
4. Tests cover digest change, stale consent, missing acceptance, replay, role mismatch, reviewer fail, and operator authorization. UI shows version and accessible required control.

### Phase 2 — Mentor payout

1. Extend Stripe port/adapter for Connect account readiness, transfers and transfer lookup/reconciliation. Keep test/live modes separated and live transfers fail closed by default.
2. Create idempotent payout allocations from eligible live ledger credits, subtract documented adjustments, and preserve stable source-to-transfer mapping.
3. Add mentor and operator views for pending/paid/failed totals and safe retry. Failure/replay/partial-batch tests prove successful transfers cannot be duplicated and one mentor cannot see another's details.
4. Do not initiate payout unless current mentor terms are accepted and Connect reports payout readiness.

### Phase 3 — Retention sweep

1. Add an idempotent scheduled `retention:sweep` for the categories and deadline above; select bounded batches and persist progress/status.
2. Preserve consent, legal review, accounting, payout and aggregate evidence while deleting specified content and citation snapshots.
3. Tests cover before/at/after boundary, rerun, partial failure, legal hold, referential integrity and absence of content in logs/events.

### Phase 4 — Founder metrics

1. Add read-only aggregate query and operator dashboard for the metric definitions above, with explicit windows and live/test separation.
2. Test each metric against hand-built fixtures including refunded purchases, test transactions, missing attribution, duplicate webhook transitions and vault generation failures.
3. Show definitions and data limitations; do not label results as a decision or infer intent.

### Phase 5 — Readiness rehearsal (human gate, not code)

On a staging deployment using Stripe test mode, rehearse publishing/reviewing terms, seeker acceptance, mentor acceptance, Connect onboarding, a payout with retry/replay, retention dry-run and deletion at a controllable clock, and metrics containing test/live fixtures. Record evidence in `.ai/runs/`. Founder A may enable live payments only after the current terms and E02 notice review pass, E01/E02 rehearsal is recorded, E03 consent flows are deployed, and the owner explicitly records the live flip. No agent or deploy script makes this decision.

## Traceability

| Backlog story | Acceptance evidence |
|---|---|
| #18 Write pilot terms for review | Versioned draft and immutable published digest, with all D15/D17 topics represented and no claim of legal sufficiency |
| #19 Verifier reviews terms and payment handling | Review record tied to exact digest and scope; absent/failed/stale record blocks live gate |
| #20 Delete session text and notes 30 days after 2026-12-14 | Repeatable bounded sweep removes the enumerated content at the defined deadline and preserves allowed records |
| #21 Seeker accepts terms at payment | Persisted acceptance required before each checkout, tied to version and subject |
| #22 Mentor accepts and is paid through Stripe | Mentor consent gates publication and transfer; idempotent Connect payouts trace to credits |
| #23 Founder reads pilot counts at two reviews | Operator report exposes reproducible live-only counts and separate test/refund/failure views |

## Risks and unresolved business choices

- D15 supplies provisional terms but the actual verifier review is still pending. Founder A must provide the reviewed wording; implementation must not invent legal language or synthesize approval.
- D11 sets the mentor share to 80% before processor fees; D17 does not settle whether fees reduce the share. This spec pays the already-recorded 80% ledger credit and does not retroactively deduct fees.
- Stripe Connect account requirements, country availability, transfer timing, refund-after-release bookkeeping and tax reporting must be confirmed in the staging rehearsal. A blocked or unsupported account remains unpaid and visible as blocked.
- Retention date uses an inclusive 30-day interpretation and Europe/Warsaw end-of-day boundary. This is an implementation default from D15/D18; preserve it in the UI/runbook.
- D08 windows and thresholds are founder-selected targets without baseline. Reports show facts and leave interpretation to the named owners.
- Existing paid rows may lack terms acceptance because E01 may predate this feature. They are not silently treated as consented; no new real checkout proceeds until current consent exists. Existing live paid balances need an operator reconciliation before payout.

## Autonomous defaults to surface for owner review

| Topic | Default used here | Impact |
|---|---|---|
| Terms versioning | Separate seeker and mentor versions, immutable digest; any update requires re-acceptance | Clear evidence of exactly what each person accepted |
| Verifier record | Founder A records a human pass/fail against digest and named scopes | Software stores the assertion but cannot verify credentials or legal adequacy |
| Payout scope | Only released vault-answer credits already present in the E02 ledger | No session payout rule is invented |
| Payout retry | One stable idempotency key per source credit, reconcile before retry | Prevents duplicate transfer while allowing recovery |
| Retention boundary | 2027-01-13 23:59:59 Europe/Warsaw; preserve financial, consent, review and aggregate records | Applies D15's 30 days after pilot end, inclusive |
| Metrics | Live mode only for decision counts; test data shown separately | Test money cannot satisfy D08 prepayment thresholds |

