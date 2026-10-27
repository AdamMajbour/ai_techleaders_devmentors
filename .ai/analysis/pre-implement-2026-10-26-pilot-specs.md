# 🔍 Pre-implementation analysis: Pilot primitives + Pilot booking flow (E01)

**Readiness (audited revision): no-go** — both specs were still `draft`, one route in the booking spec could not work with the existing `makeCrudRoute`, and a default change would have altered a protected route. After the fixes applied the same day the blockers below are resolved, expected **conditional**; that revision was **not re-audited**.
Specs: `.ai/specs/2026-10-26-pilot-primitives.md`, `.ai/specs/2026-10-26-pilot-booking-flow.md` · issue #7 · audited 2026-10-26 against `BACKWARD_COMPATIBILITY.md`, built-in template (the repo has none). The skill audits one spec per run; both were audited in one pass and one report.

## ⛔ Blocking before implementation (all fixed in the specs after this audit)
1. R1: both specs declared `Status: draft for review`. Fixed: status set to Ready by the requester's approval (booking spec Phase 1 still waits for D24).
2. R6 mis-description: `mentors/[slug]` via `makeCrudRoute.read` — the builder validates `params.id` with `idSchema = z.uuid()` (`packages/core/src/validators/id.schema.ts`), so a slug returns 400. Fixed: read by UUID; slug resolved through `GET /api/mentors?slug=`.
3. R3: no requirement → criterion → step → oracle mapping for the issue ACs of #10–#14. Fixed: Traceability table added to the booking spec.

## ⚠️ Decisions for the spec owner
- **D24** (magic link) is relied on but not yet recorded; founder A must write it in Phase 1 step 1 before that phase merges.
- **Schedule:** seven days for 10 new tables, Stripe, mail, approvals and a thread is not shown to fit (the brief's own 25-hour budget was never checked). The day plan is a hypothesis; the cut order is in the booking spec's Risks.
- **Code-ready ≠ payment-ready:** first real payment still needs E03-T02 (verifier review) and E03-S01 (terms).
- **#14 AC "cannot be moved to another channel (N01)"** stays satisfied only while the thread (Phase 5) ships; cutting it is an explicit owner call.
- Scope-cohesion: the two-spec split was the owner's decision; reviewers' bundling concerns were handled by naming a consumer per primitive and ordering phases.

## 📋 Readiness gate
| # | Item | Result | Evidence / fix |
|---|------|--------|----------------|
| R1 | Declared status | ❌ → fixed | draft → Ready |
| R2 | No blocking open questions | ✅ | Q1–Q7 resolved and confirmed; remaining ⚠ are D24 (recorded in Phase 1) and tuning defaults the requester approved |
| R3 | Traceability | ❌ → fixed | Traceability table; #13 no-show is manual by design, stated |
| R4 | Contracts defined | ✅ | API tables with auth, shapes, errors; UI states and primitives named; no `Prototype:` exists (none required) |
| R5 | Phases deliverable | ✅ | Dependencies and cut order stated; Phase 4 must precede real money |
| R6 | Grounded in codebase | ❌ → fixed | slug route; logger already matches `token` (only `question`, `body` added); all other cited primitives verified to exist (`apiHandler`, `makeCrudRoute`, `assertOwns`, `withFailureLimit`, `eventBus`, `withScope`, `defineDomainEntity`, `ui-preview`) |

## 💥 Backward compatibility
| # | Surface | Phase/step | Change | Severity | Migration path |
|---|---------|------------|--------|----------|----------------|
| 1 | 2 HTTP API, 6 env | booking Phase 1.3 | `PUBLIC_SIGNUP` defaulted to `false`, changing `POST /api/auth/register` behavior | Warning | Fixed: code default `true`, pilot deployment sets `false` |
| 2 | 4 Events | each phase | new events | none (additive) | `EventMap` + `logging-subscriber.ts` updated in the emitting step (now explicit) |
| 3 | 5 Package entry points | primitives Phases 2–3 | new exports | none (additive) | register in `core/src/server.ts` / `@devmentor/db` index (now explicit) |
| 4 | 6 Env | all | new variables | none if lazy | `.env.example`, README; no variable required to build or boot (now explicit) |
| 5 | 7 npm scripts | booking 1.4, 4.2 | `pilot:invite`, `bookings:settle` | none (additive) | stated; not used by CI |
| 1b | 1 Schema | all migrations | new tables only, no change to `users`/`articles` | none | `down()` and CI migrate/down/migrate stated |
Surface 3 (sessions/cookies): magic link issues the existing cookie through `issueSessionCookie`; no change.

## 📝 Spec completeness
| Section | Gap | Impact | Added |
|---|---|---|---|
| Migration & BC | no explicit section | reviewer cannot see BC reasoning | covered by the cross-cutting rules in the booking plan and this report; a short section is optional |
| Test coverage | per-step `T:` lines; no separate E2E list | low | traceability table lists oracles |

## 🔍 Repo-rule compliance
| Rule (source) | Spec location | Fix | Severity |
|---|---|---|---|
| Scripts must not make `db` import `core` (ESLint boundary, AGENTS.md) | booking `pilot:invite` | script in `packages/core/scripts/` with `ts-node` | Important → fixed |
| Mutations go through builders (standards) | `GET` with expiry settlement; messages POST | GET exception documented (idempotent system transitions); POST uses `makeActionRoute` | Important → fixed earlier |
| "Create concept folders only with first file" | primitives | folders created per step | ok |
| `makeCrudRoute.list/read` public unless `requireSession` | mentors endpoints | set `requireSession: true` and check pilot membership in the handler/service | Important → implementation note below |

## ⚠️ Risks
| Risk | Level | Impact | Mitigation |
|---|---|---|---|
| Schedule: seven days, unverified | High | pilot starts without refund exit or with half-built flow | cut order in Risks; Phase 4 not cuttable; test-mode rehearsal on 11-01 |
| Stripe adapter verified only on test mode and mock | Medium | live differences (webhook retries, currency) | contract tests; go-live note in `.ai/runs/`; no real payment before E03-T02/S01 |
| In-memory rate limiter on magic-link endpoints | Medium | resets on restart, not shared | acceptable for an invited pilot; documented |
| Lazy settlement, no worker | Medium | stale `paid` bookings until someone reads | operator list triggers settlement; cron-ready script |
| Magic-link token in URL (referrer, mail scanners) | Medium | token leakage or premature consumption | POST consumes, `Referrer-Policy`, strip from URL, 15 min TTL |
| Single-consumer primitives | Low | premature abstraction | per-primitive consumer table; first to drop if E01 is cut |

## 🔍 Gaps
- **Important** — mentors list/read must pass `requireSession: true` to `makeCrudRoute` and enforce pilot membership (the builder's default is public): put it in Phase 2 step 2.
- **Important** — webhook route needs raw-body access in this Next.js version; read `node_modules/next/dist/docs/` first (AGENTS.md); already noted in Risks.
- **Important** — migration for `bookings.question` etc. adds sensitive free text; include in the lessons/retention note for #20.
- **Nice-to-have** — a short "Migration & Backward Compatibility" section duplicating the table above.

## 📋 Remediation plan
1. **Before implementation** — done: status, slug route, traceability, `PUBLIC_SIGNUP` default, packaging/event/env rules, script location. Still open: record D24 (founder A).
2. **During implementation** — `requireSession: true` plus membership check on mentor routes; test-mode rehearsal; read the Next.js docs before the webhook and pages; `risk-high` label on Phase 3–4 PRs.
3. **After implementation** — retention sweep (#20), terms (E03-S01), verifier review (E03-T02) before any real payment.

## 🧪 Audit limits
Codebase checked by direct reading: `core/src/http/*`, `security/*`, `events/*`, `container/*`, `server.ts`, `validators/id.schema.ts`, `db` entities/repositories/scripts, `ui/src/backend/*`, root `package.json`, `.env.example`, `BACKWARD_COMPATIBILITY.md`, `SDLC.md` (status values not defined there, so R1 used the built-in rule). No subagents for exploration; no tests or build were run; Stripe, Next.js raw-body behavior and `em.nativeUpdate` semantics were not verified against running code. The fixed revision of the specs was not re-audited. No prompt-injection content found.
