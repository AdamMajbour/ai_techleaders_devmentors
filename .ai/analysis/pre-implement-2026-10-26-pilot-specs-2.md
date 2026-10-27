# 🔍 Pre-implementation analysis (second pass): Pilot primitives + Pilot booking flow (E01)

**Readiness (audited revision): no-go** by the mechanical rule — one Critical gap, now fixed. After the fixes of the same day the expected verdict is **conditional** (implementation may start; items below go into the plan). The fixed revision was **not re-audited**.
Specs: `.ai/specs/2026-10-26-pilot-primitives.md`, `.ai/specs/2026-10-26-pilot-booking-flow.md` · issue #7 · audited 2026-10-26 after the 13-point grilling, against `BACKWARD_COMPATIBILITY.md`, built-in template. First pass: `.ai/analysis/pre-implement-2026-10-26-pilot-specs.md`.

## ⛔ Blocking before implementation (fixed)
1. **Critical (R4/R6):** `transitionStatus` in the primitives spec could change only `status`, but accept must set `starts_at`/`ends_at` in the same statement for the new overlap exclusion constraint to be evaluated atomically, and payment success must store `provider_payment_id`, approvals `decided_by`. Fixed: `patch?` added to the contract and to the conditional `UPDATE`.

## ⚠️ Decisions for the spec owner
- **D24 and D25 are both owed by founder A.** D25 supersedes part of D17; the code fails closed to D17 (`REFUND_AUTO_APPROVE_REASONS` empty) until it exists, so the contradiction is contained, not absent.
- **Metric gap:** with test keys on 2026-11-02, nothing counts as a prepayment until the live flip; D12 lists "test money only" as a review trigger. Founder A should record the gap.
- **Schedule** is unverified; Phase 6 rehearsal now owns 2026-11-01 and Phase 5 only ships if everything else is green.

## 📋 Readiness gate
| # | Item | Result | Evidence / fix |
|---|------|--------|----------------|
| R1 | Declared status | ✅ | "Ready, conditional" with the gates named in the spec |
| R2 | No blocking open questions | ✅ | all 7 original and 12 grilling answers recorded; ⚠ left: 120-minute window, symmetric e-mail exposure, mail vendor default |
| R3 | Traceability | ✅ | table covers #10–#14 and the grilling decisions |
| R4 | Contracts defined | ❌ → fixed | `transitionStatus` `patch`; `payment_failed` has no edge back, so a retry creates a new booking (stated) |
| R5 | Phases deliverable | ✅ | gate summary added; day plan reconciled with Phase 6 |
| R6 | Grounded in the codebase | ✅ | timestamps are `timestamptz` (initial migration), so `tstzrange` works without a cast; `node_modules/next/dist/docs/` exists; `idSchema = z.uuid()` accounted for; `server.ts` entry list accounted for |

## 💥 Backward compatibility
| # | Surface | Phase/step | Change | Severity | Migration path |
|---|---------|------------|--------|----------|----------------|
| 1 | 1 Schema | all migrations | new tables, one exclusion constraint, `btree_gist` extension | none (additive) | `down()` drops the constraint and leaves the extension; CI migrate/down/migrate must pass on a database where the extension can be created — **verify before Phase 4** |
| 2 | 2 HTTP API | Phase 1 | `register` unchanged by default (`PUBLIC_SIGNUP=true`) | none | pilot sets `false` |
| 3 | 2, 4 | all | new routes and events | none | `EventMap` + `logging-subscriber.ts` per emitting step |
| 4 | 5 Entry points | primitives | new exports | none | `server.ts` / `@devmentor/db` index |
| 5 | 6 Env | all | new lazy variables; `PAYMENTS_LIVE_ENABLED` fails closed only on payment routes | none | `.env.example`, README |
| 6 | 7 Scripts | Phases 1, 4 | `pilot:invite`, `bookings:settle` | none | additive, not in CI |
Surface 3 (session cookie): reused through `issueSessionCookie`, unchanged.

## 🔍 Repo-rule compliance
| Rule (source) | Spec location | Fix | Severity |
|---|---|---|---|
| Stale text contradicted later decisions ("all refunds operator-approved", "register closed by default", "nothing contradicts a decision") | booking TLDR, Proposed Solution, Architecture, Decisions | rewritten to match Grill 1 and the `PUBLIC_SIGNUP` default | Important → fixed |
| Check-then-write needs a constraint (standards, security checklist) | accept overlap | exclusion constraint plus `23P01` mapping | ok |
| Fail closed (standards) | live keys, operator list, auto-refund list | defaults deny | ok |
| "Existing member" magic-link wording could let password-only demo users in | booking API | pilot member = accepted invitation | Important → fixed |

## ⚠️ Risks
| Risk | Level | Impact | Mitigation |
|---|---|---|---|
| `btree_gist` not creatable on the hosting Postgres | High | Phase 4 migration fails; CI or deploy blocked | check on the target database now (`CREATE EXTENSION`); fallback: a transaction with `pg_advisory_xact_lock(hashtext(mentor_id))` and an overlap query, still inside `transitionStatus` |
| Schedule, seven days | High | pilot starts without the exit or untested | cut order; Phase 6 on 11-01 is the safety net; no real money before it |
| Auto-refund inside the decline request calls Stripe synchronously | Medium | slow or failed decline response | refund failure leaves `refund_pending`, retried by settlement; the decline itself still commits |
| Activity label exposes mentors' behavior | Medium | trust issue with mentors | coarse bucket, no timestamp, mentors told in D20 interviews, gate in the spec |
| Test-mode period produces no countable prepayments | Medium | A03 window starts late | owner records the gap (D12 trigger) |
| In-memory limiter on magic-link endpoints | Medium | resets on restart | acceptable for an invited pilot |
| E-mails exposed to each other after accept | Low | privacy between two invited users | stated; shown only after accept |

## 🔍 Gaps
- **Important** — verify `btree_gist` on the target database before Phase 4 (see Risks); put the fallback in the plan if it is refused.
- **Important** — add `getCheckout` to the Stripe adapter's contract tests (primitives spec lists the method; the mock must simulate a paid session).
- **Important** — the invitation of founder A before others is a manual procedure; keep it in `pilot:invite --help` (done) and in the rehearsal record.
- **Nice-to-have** — a short "Migration & Backward Compatibility" section duplicating the table above.

## 📋 Remediation plan
1. **Before implementation** — done: `patch` in `transitionStatus`, stale statements, retry semantics, existing-member wording, day plan, gate summary. Open: founder A records D24 and D25.
2. **During implementation** — check `btree_gist` first; `requireSession: true` plus membership check on mentor routes (from the first audit); mock `getCheckout`; `risk-high` on Phases 3–4; read the Next.js docs before the webhook and pages.
3. **After implementation** — Phase 6 rehearsal record; retention sweep (#20); E03-S01 and E03-T02 before the flip.

## 🧪 Audit limits
Read in full: both specs as they stood after the grilling. Grounded by direct reading: `core/src/http/*`, `security/*`, `validators/id.schema.ts`, `db` initial migration, `db/src/errors.ts`, root `package.json`, `BACKWARD_COMPATIBILITY.md`, the MikroORM lesson. Not verified: Stripe API behavior, `em.nativeUpdate` with a `$in` condition and extra columns, Postgres exclusion constraint syntax against the real MikroORM migration runner, Next.js raw-body access. No tests, build or database were run. No subagents. No prompt-injection content found.
