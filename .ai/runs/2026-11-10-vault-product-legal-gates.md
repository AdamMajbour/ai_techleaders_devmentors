# Vault product and legal gates

Date opened: 2026-11-10
Scope: E02 pilot vault answers and selected-time booking
Status: **Open; no launch approval recorded.** This register records evidence required by `.ai/specs/2026-10-27-pilot-vault-answers.md`. It does not make owner, legal, or rehearsal decisions on their behalf.

| Gate | Owner / reviewer | Required record or evidence | Status |
|---|---|---|---|
| D20 mentor interview | Founder B | Record an interview covering mentor share, AI use of notes, and preview/veto expectations; link evidence and decision to the issue/spec. | **Complete:** requester confirmed Founder B conducted the 2026-11-10 Mentor A interview and one mentor is sufficient. Summary is recorded; no transcript/method supplied. Do not generalize to other mentors. |
| D26 refund and preview policy | Founder A (Oliwia) | Record refund approval, preview window, citation limit, and D08 counting rule. | **Recorded 2026-11-12:** vault refunds require operator approval; no response within 120 minutes expires and requests a refund; max 3 cited mentors; only `released` answers count. Resolved Q4 one-rejection rule remains. |
| Legal entity and qualified reviewer | Founder A; reviewer identified as Adam in D21 | Verify the registered entity name and reviewer role/qualification. | **Deferred at requester direction; still blocks real payments and production publication.** |
| E03-T01 terms | Terms owner / founder A | Write terms naming the verified controller, payment and AI processors, data use/retention, mentor visibility, refunds, and payouts. | **Deferred at requester direction; still required before real notes/questions or live payments.** |
| E03-T02 review | Qualified verifier | Record review of the notice and terms, including processors and data retention. | **Deferred at requester direction; not waived as a launch gate.** |
| Operator coverage | Founder A / named operator | Configure `OPERATOR_USER_IDS`, name the person covering approvals, and confirm coverage before any live vault purchase. | **Local demo operator only; live coverage not attested.** |
| Settlement scheduler | Deployment owner | Configure the platform cron for `npm run vault:settle` and record a successful staging run. | **Deferred at requester direction; still required before live purchases.** |
| Phase 5 mock staging rehearsal | Product owner and QA | Exercise purchase, preview, rejection/expiry, take-down, cancellation, refund, and ledger paths on staging. | **Deferred at requester direction; local E2E is not a substitute.** |
| Synthetic Anthropic rehearsal | Product owner and QA | Use synthetic notes and record model, token usage, and cost on staging. | **Deferred at requester direction; still required before live AI.** |
| Live flip | Founder A | Only after D20, D26, E03-T01/T02, named operator, scheduler evidence, and rehearsal evidence: explicitly decide whether to enable `VAULT_ENABLED`, `VAULT_PUBLISH_ENABLED`, `AI_LIVE_ENABLED`, and any refund auto-approval reasons. | **Not authorized; all live gates remain closed** |

## Evidence gathered locally

- The completed local evidence is recorded in `.ai/runs/2026-11-10-integration-qa-update.md`: isolated PostgreSQL integration 49/49, unit tests 119 suites / 782 tests, UI stories 323/323, and Playwright E2E 33/33. The E2E flow covers selected-time booking and mock vault purchase through mentor approval and answer release.
- Local browser evidence is in `.ai/qa/artifacts_e02-local/report.md`; the reusable local environment is `.ai/qa/test-env.json`. Playwright/Chromium was used because the configured `agent-browser` provider was unavailable in this Windows session.
- Local verification used mock payments and mock AI only. It sent no data to a payment or AI processor, does not establish legal sufficiency, and does not satisfy the staging rehearsal.

## Decision log

D26 is recorded from the founder A decision relayed on 2026-11-12. D20 is complete based on the requester-confirmed Founder B interview with Mentor A; evidence is a summary, not a transcript. Legal review, staging, and live-flip decisions are not made by this run; the requester asked to defer the legal and staging work, but those conditions remain launch blockers. Local test evidence does not change those statuses.
