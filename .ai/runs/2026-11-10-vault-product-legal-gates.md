# Vault product and legal gates

Date opened: 2026-11-10
Scope: E02 pilot vault answers and selected-time booking
Status: **Open; no launch approval recorded.** This register records evidence required by `.ai/specs/2026-10-27-pilot-vault-answers.md`. It does not make owner, legal, or rehearsal decisions on their behalf.

| Gate | Owner / reviewer | Required record or evidence | Status |
|---|---|---|---|
| D20 mentor interviews | Founder B | Record interviews covering mentor share, AI use of notes, and preview/veto expectations; link evidence and decision to the issue/spec. Until recorded, do not ask mentors to publish notes. | **Not recorded** |
| D26 refund and veto decision | Founder A (Oliwia) | Explicitly record whether vault rejection, expiry, and generation-failure refunds are automatic; record that preview is a veto and silence expires/refunds; confirm the three-mentor limit and counting rule. Until recorded, keep vault refund reasons out of `REFUND_AUTO_APPROVE_REASONS`; operator approval remains required. | **Not recorded** |
| Legal entity and qualified reviewer | Founder A; reviewer identified as Adam in D21 | Replace â€śInstytucja Prawnaâ€ť with verified registered entity name; record Adamâ€™s role/qualification and whether D17â€™s qualified-reviewer condition is met. | **Unverified / not recorded** |
| E03-T01 terms | Terms owner / founder A | Write terms that name the verified controller/payment entity, payment and AI processors (including Anthropic if enabled), data categories, purpose, retention, mentor visibility of the question, refunds, and payout handling. State processor retention and purpose before real notes/questions are sent. | **Not available in this worktree** |
| E03-T02 review | Qualified verifier; D21 names Adam, qualification pending | Record the verifierâ€™s review outcome for the mentor notice and terms, including processor name/retention/purpose. Production publication and live Anthropic calls stay disabled until this is complete. | **Not reviewed** |
| Operator coverage | Founder A / named operator | Configure `OPERATOR_USER_IDS`, identify a person responsible for the approvals queue, and confirm coverage before any live vault purchase unless D26 is recorded and the approved path removes that dependency. | **Local demo operator only; live coverage not attested** |
| Settlement scheduler | Deployment owner | Configure the platform cron for `npm run vault:settle`; if enabling generation, use `-- --include-ai` only with an explicit AI budget. Record a successful staging run and alert/ownership. | **Not configured / not evidenced** |
| Phase 5 mock staging rehearsal | Product owner and QA | On the target staging stack, use mock AI, test payments, and the real mail provider. Exercise publish/consent, purchase, approve/reject/expiry, take-down, operator cancellation, mock failure tokens, lost webhook, refund queue, and ledger split/test-vs-live balances. Record each check. | **Not run; local E2E is not a substitute** |
| Synthetic Anthropic rehearsal | Product owner and QA | After mock rehearsal, use synthetic-only notes with `AI_MODE=anthropic` and `AI_LIVE_ENABLED=true`; record model, token usage, and cost. | **Not run** |
| Live flip | Founder A | Only after D20, D26, E03-T01/T02, named operator, scheduler evidence, and rehearsal evidence: explicitly decide whether to enable `VAULT_ENABLED`, `VAULT_PUBLISH_ENABLED`, `AI_LIVE_ENABLED`, and any refund auto-approval reasons. | **Not authorized; all live gates remain closed** |

## Evidence gathered locally

- PostgreSQL integration suite runs against isolated `devmentor_test`; 49/49 cases passed after fixing the test reset to remove the trigger function that survives table drops and correcting the selected-slot fixture.
- The repository Playwright E2E suite runs its own `devmentor_e2e` database and Chromium. Its first run passed 31/32 cases and exposed an outdated booking test that omitted the now-required slot. The booking test is being updated to publish a slot; the rerun result will be appended here.
- Local verification uses mock payments and mock AI only. It does not send data to a payment/AI processor, does not establish legal sufficiency, and does not satisfy the staging rehearsal.

## Decision log

No D20, D26, legal review, or live-flip decision is made by this run. Attach owner/verifier records here or link them from the spec before changing any production gates.
