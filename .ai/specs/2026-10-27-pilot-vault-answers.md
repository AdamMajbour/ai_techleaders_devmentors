# Pilot vault answers (E02): mentor notes, AI-generated answers with mentor preview, credited purchase

Status: Draft for review (gate answered by the requester 2026-10-27; not yet audited with `om-pre-implement-spec`). Source: issue #8 (E02) with #15, #16, #17; design authority `.ai/specs/product-brief.md`. **Depends on** `2026-10-27-pilot-primitives-2.md` (Phases 1, 3 and 4, and Phase 2, which lands after E01 is live) and through it on `2026-10-26-pilot-primitives.md` and `2026-10-26-pilot-booking-flow.md` (E01: payments, refunds, invitations). None of the three is implemented yet.

## 📝 TLDR

Mentors answer the same questions unpaid and paste from a private doc (`[INTERVIEW]`); whether seekers want an answer drawn from a mentor's notes is untested (A01, accepted untested in D01). Today the app has no notes, no AI call and no per-mentor money. **Proposed (future behavior):** a mentor publishes markdown notes after being told, and agreeing per note, that they feed AI answers (D09); a seeker pays 10 EUR (D16) and receives an AI-generated answer built from the consenting mentors' notes; every cited mentor sees it first until 2026-12-14 (D09, D14, D18) and one rejection stops it with a refund; the released answer shows each mentor's name and note title (D10, D14); 80% of the price is credited equally to the cited mentors in a ledger (D11); payout is E03. Built from the primitives of the two primitives specs, plus a vault-local review table for the several-mentor approval (D14), which is not generalized until a second consumer exists.

## 📝 Resolved questions

| Q | Answer (requester, 2026-10-27) | Consequence |
|---|---|---|
| Q1 | Separate "primitives 2" spec | This spec contains no primitive code |
| Q2 | After the pilot start 2026-11-02 | Designed for a running pilot; see the schedule risk |
| Q3 | Pay first, then generate, mentors preview, release; reject or expiry = refund (the requester accepted that "not charged" in #17 means charged then refunded) | Reuses E01's refund path; until D26 the refund waits for the operator, see Gate summary |
| Q4 | All cited mentors must approve; one rejection rejects the answer (and the approval is vault-local, no shared engine, requester 2026-10-27) | `vault_answer_reviews`, decided in one transaction |
| Q5 | The model gets all consenting notes of all mentors (except the buyer's own) in one prompt and cites by note id; no retrieval | `NoteSelector` seam; corpus cap |
| Q6 | AI behind a port; Anthropic adapter plus mock; generation after the response with `generating` status and polling | `AI_MODE`, `AI_LIVE_ENABLED` gate |
| Q7 | Per-note consent with a versioned notice; only standalone mentor-written notes | Session notes (R02) stay out |
| Q8 | Ledger now, no payout; remainder cents to the first mentors in citation order; 80% of the price before fees; ledger trimmed to credits (requester 2026-10-27) | `ledger_entries` (credits only), `splitEqually`; no reversal, no refund after release in code |

## 📝 Problem Statement

Mentors answer the same few questions unpaid in DMs and Slack and paste from a private doc (`[INTERVIEW]` mentor 2026-08-22, senior Python speaker and staff engineer 2026-09-03). That seekers want an answer drawn from notes is untested: no interviewed seeker asked for saved or reusable answers (A01). The epic exists to test it behaviourally: fewer than 3 people book or pay for a vault answer within 4 weeks narrows D01 to sessions only (D05, D08); whether the notes cover real questions is a separate supply gate (6 of 10, provisional). This spec makes the test runnable and its numbers countable (paid vault answers, separately from sessions, with the unanswerable rate as the coverage signal) without deciding anything the brief leaves to the owner.

## 📝 Proposed Solution

Three slices, delivered in an order that differs from the backlog order for a technical reason: #16 (preview) cannot be exercised before #17's purchase and generation exist, so the phases are notes (#15) → purchase and generation (first half of #17) → preview (#16) → release and credit (second half of #17). Every issue acceptance criterion is traced below.

- **Lifecycle.** A `vault_answer` is a state machine driven only by `transitionStatus`: `pending_payment → paid → generating → pending_preview → released`; exits `payment_failed`, `generation_failed` (refund), `rejected` (refund), `expired` (refund). After `isPreviewRequired` turns false, `generating → released` directly (D18).
- **Corpus.** All published, AI-consented notes of all pilot mentors except the buyer's own, sorted by id, capped by `VAULT_MAX_CORPUS_CHARS` (newest first when over, with a warning). Sorted order keeps runs reproducible in tests and logs.
- **Citations are snapshots.** Title and mentor name are copied into `vault_answer_citations` at generation, so a later rename or takedown cannot change what a seeker bought.
- **Review.** One `vault_answer_reviews` row per distinct cited mentor, created with the citations. `VaultReviewService.decide` runs in one `UnitOfWork.run`: lock the answer row, record the decision, and in the same transaction either reject (status change plus a refund request row) or, on the last approval, release (status change plus ledger credits). There is no handler after commit and no repair task, because everything it does is database work; refund *execution* is the separate external task from primitives 2.
- **Refunds** go through E01's `ApprovalService`, with the three new reasons `vault_rejected`, `vault_expired`, `vault_generation_failed`; auto-approved only when listed in `REFUND_AUTO_APPROVE_REASONS` after D26 (below), otherwise the operator approves.

Alternatives considered:
- **Generate and preview before charging** (rejected by Q3): it spends mentors' time on unpaid questions and drops the "prepaid" count of D05.
- **Retrieval before the model** (rejected for now, Q5): the pilot corpus is a handful of mentors; a `NoteSelector` seam lets Postgres full-text or pgvector replace it. Cost of the choice: every purchase sends the whole corpus to the processor.
- **One mentor's notes per question** (rejected, Q5): would make D14 unreachable.
- **Retrieved excerpt without generation** (D06 rejected it for the pilot).
- Market reference (general knowledge, not freshly verified): support products that answer from a knowledge base (Intercom Fin style) show the source article with the answer and hand off to a human when confidence is low; we adopt "answer shows its sources" and "unanswerable is an honest outcome with a refund", and skip confidence scores. Topmate sells a creator's own answers directly; no benchmark in the brief shows reuse of session knowledge (A01 stays untested).

## 📝 Architecture

Concepts: `notes`, `vault` (answers, citations), `ledger` (from primitives 2), reusing E01's `approvals` (refund requests only), `payments`, `ai`. Reused: state machine with `pickVisible`, `transitionStatus`, `UnitOfWork`, `makeCrudRoute`/`makeActionRoute` (with `background`), `PaymentSubjectHandler`, settlement, `ApprovalService` (refund requests), `LedgerService`, `AnswerGenerator`, `Mailer`, `Clock`, `MarkdownView`, `ApprovalQueue`, `usePolling`. New external dependency: the Anthropic API (behind the port). Consumers of this spec: E03 (terms must name the processor, S03 counts include vault payments, S02 pays out the ledger).

```mermaid
flowchart LR
  classDef existing fill:#e5e7eb,color:#111,stroke:#9ca3af
  classDef new fill:#2f6feb,color:#fff,stroke:#1b4fb0
  Note["note: draft → published (consent)"]:::new --> Corpus["NoteSelector"]:::new
  Q["seeker question"]:::new --> Pay["pending_payment → paid (webhook)"]:::existing
  Pay -->|"after() + settlement"| Gen["generating (AnswerGenerator)"]:::new
  Corpus --> Gen
  Gen --> Prev["pending_preview (all cited mentors)"]:::new
  Prev -->|"all approve"| Rel["released + ledger credits"]:::new
  Prev -->|"reject / expire"| Ref["refund approval"]:::existing
  Gen -->|"unanswerable / failed"| Ref
```

Takeaway: one linear lifecycle with three refund exits that share E01's refund path; the only new external call is generation, and everything it can get wrong is checked by `validateGeneration` before a human or a seeker sees it.

## 📝 Data Model

Conventions as in the primitives specs. Tables from those specs (`status_transitions`, `approval_requests`, `ledger_entries`, `payments`) are referenced, not repeated.

| Table (concept) | Columns (beyond id, created_at, updated_at) | Constraints / notes |
|---|---|---|
| `notes` (notes) | `mentor_id`, `title` (≤120), `body` (markdown ≤20000), `status` (`draft`\|`published`\|`taken_down`), `ai_notice_version`, `ai_consented_at`, `published_at`, `taken_down_at` | index (`mentor_id`,`status`); a published note requires `ai_notice_version` and `ai_consented_at` (check constraint); no foreign key to users (plain uuid) |
| `vault_answers` (vault) | `seeker_id`, `question` (≤2000, sensitive), `status`, `price_minor`, `currency`, `answer_text` (null until generated), `failure_reason` (set only with `generation_failed`: `unanswerable`\|`refused`\|`invalid_output`\|`unavailable`\|`config`; `rejected` and `expired` are statuses, not reasons), `model_id`, `input_tokens`, `output_tokens`, `generation_attempts`, `generation_started_at` (the lease), `preview_required` (bool, decided at `paid`), `review_expires_at` (set with the reviews) | indexes (`seeker_id`,`created_at`), (`status`,`generation_started_at`); `price_minor` is the server constant snapshot |
| `vault_answer_reviews` (vault) | `answer_id`, `reviewer_id`, `decision` (`approved`\|`rejected`, null until decided), `decided_at`, `reason` (≤500, optional) | unique (`answer_id`,`reviewer_id`); one row per distinct cited mentor; `reason` is free text about someone's work: read by the operator only, never logged or put in events |
| `vault_answer_citations` (vault) | `answer_id`, `note_id`, `mentor_id`, `mentor_name`, `note_title`, `position` | unique (`answer_id`,`note_id`); order by `position` is the order for the remainder-cent rule; snapshots, never joined back for display |

Statuses (`vault_answer`): `pending_payment`, `payment_failed`, `paid`, `generating`, `generation_failed`, `pending_preview`, `rejected`, `expired`, `cancelled`, `released`. Actors: `seeker`, `assignee` (a cited mentor with a review assignment, resolved by the DTO mapper from `vault_answer_reviews`; actor names are per machine), `system`, `webhook`, `operator`. Transitions: `confirm_payment` (webhook/system), `fail_payment`, `start_generation` (`paid → generating`), `finish_generation` (`generating → pending_preview` or, if `preview_required` is false, `→ released`), `fail_generation`, `reject`, `expire`, `approve` (these three are applied by `system` from the review outcome: the cited mentors act through `VaultReviewService`, not through this machine), operator `cancel` (`paid`, `generating` or `pending_preview` → `cancelled`, with a refund request; never after release). `fields`: `question` visible to the seeker always and to an assignee only in `pending_preview`; `answer_text` to the seeker only when `released` and to an assignee in `pending_preview`; `seekerName` to nobody except the operator (assignees see the question, not who asked). The DTO also carries `canDecide` (true for an assignee whose own assignment is undecided while the answer is `pending_preview`), computed from the mentor's own review row and not from the status; for a reviewer the DTO's `allowedActions` is `['approve','reject']` when `canDecide` and `[]` otherwise, set by `VaultReviewService`, not by the machine. Every DTO key is declared in `fields` or listed public (the generic test of primitives 2 enforces it).

Sensitive data: `question` is free text, possibly production code; notes are mentors' own material. Neither is logged (redaction keys from spec 1 step 1.3 include `question` and `body`), neither appears in events, both leave the system only to the AI processor through the port, both are retained until 2026-12-14 plus 30 days (D15; sweep is #20, which must also delete `notes`, `question`, `answer_text` and citation snapshots).

```mermaid
flowchart LR
    classDef newEntity fill:#2f6feb,color:#fff,stroke:#1b4fb0
    classDef existingEntity fill:#e5e7eb,color:#111,stroke:#9ca3af
    users["users (existing)"]:::existingEntity
    payments["payments (E01)"]:::existingEntity
    vault_answer_reviews["vault_answer_reviews"]:::newEntity
    ledger_entries["ledger_entries (primitives 2)"]:::existingEntity
    notes["notes"]:::newEntity
    vault_answers["vault_answers"]:::newEntity
    vault_answer_citations["vault_answer_citations"]:::newEntity
    notes -->|"n-1 mentor_id"| users
    vault_answers -->|"n-1 seeker_id"| users
    vault_answer_citations -->|"n-1 answer_id"| vault_answers
    vault_answer_citations -->|"n-1 note_id"| notes
    payments -->|"1-1 vault_answer_id"| vault_answers
    vault_answer_reviews -->|"n-1 answer_id"| vault_answers
    vault_answer_reviews -->|"n-1 reviewer_id"| users
    ledger_entries -->|"n-1 source_id"| vault_answers
```

## 📝 API Contracts

All routes are `apiHandler`-wrapped (`{ ok, data | error }`); mutations need session, `x-requested-with: devmentor` and same-origin, except the shared webhook. "Pilot mentor" = pilot member whose accepted invitation has `role = mentor`; the pilot-member resolver is the one E01 Phase 1 step 2 wires to invitations, and this spec adds only an `isPilotMentor` check on top of it (no RBAC). The mentor name in citation snapshots is `users.name`, copied from the invitation's display name at first sign-in (E01). Bodies pass Zod schemas in `core/src/validators/{notes,vault}/`; actor ids come from the session only.

| Method, path | Builder | Auth | Request → response |
|---|---|---|---|
| `GET /api/notes` | `makeCrudRoute.list` | pilot mentor, own notes | `Page<NoteDto>` |
| `POST /api/notes` | `makeCrudRoute.create` | pilot mentor | `{ title, body }` → draft `NoteDto` |
| `GET/PUT /api/notes/[id]` | `makeCrudRoute.read/update` | owner | edits `title`, `body`, never `status` |
| `DELETE /api/notes/[id]` | `makeCrudRoute.delete` | owner | draft or taken-down notes only (a published note is taken down first, R03); citations are snapshots, so nothing depends on a deleted note; the retention sweep (#20) hard-deletes any note |
| `POST /api/notes/[id]/publish` | `makeActionRoute` | owner | `{ consent: true, noticeVersion }` → `NoteDto`; `noticeVersion` must equal the server's current `VAULT_NOTICE_VERSION`, else `409` "the notice changed, read it again"; allowed from `draft` and `taken_down`, always requires fresh consent |
| `POST /api/notes/[id]/take-down` | `makeActionRoute` | owner | → `NoteDto`; also rejects every `pending_preview` answer that cites the note through `VaultReviewService.cancel` (system actor, refund path) |
| `POST /api/vault-answers` | `makeCrudRoute.create` + `background` | pilot member | `{ question }` → `{ answer, checkoutUrl }`; price recomputed server-side; `409 no_notes` before any payment when the corpus (excluding the buyer's notes) is empty; a configuration error (`503`) before any payment when `AI_MODE`, `AI_LIVE_ENABLED` or the key is not usable, so a mis-set flag never charges anyone; at most 3 open answers per seeker (`paid`, `generating`, `pending_preview`, and `pending_payment` younger than 15 minutes; `TooManyRequestsError`, `429`) |
| `GET /api/vault-answers` | `makeCrudRoute.list` | the seeker | own answers with `status`, `refundStatus`, `allowedActions`, `serverTime`; runs `settleOnRead` |
| `GET /api/vault-answers/[id]` | `makeCrudRoute.read` | seeker or assignee | `VaultAnswerDto` through `pickVisible`; non-participant → `404` |
| `POST /api/vault-answers/[id]/reconcile-payment` | `makeActionRoute` | the seeker | → `VaultAnswerDto`; `PaymentService.reconcile('vault_answer', id)` |
| `POST /api/operator/vault-answers/[id]/cancel` | `makeActionRoute` | operator | for an answer stuck in `paid`, `generating` or `pending_preview`: status `cancelled`, open reviews closed, refund request `operator_initiated`; refused after `released` |
| `GET /api/operator/vault-answers?status=` | `apiHandler` | operator | `{ id, status, failureReason, rejectionReasons[], createdAt }` with no question and no text: the only place rejection reasons are read, and the data for the unanswerable rate |
| `GET /api/vault/previews` | `apiHandler` | pilot mentor | pending items assigned to the caller: `{ answerId, question, answerText, citations, expiresAt }` |
| `POST /api/vault-answers/[id]/approve` | `makeActionRoute` | assignee | `{}` → `{ decision, answerStatus }`; `VaultReviewService.decide` |
| `POST /api/vault-answers/[id]/reject` | `makeActionRoute` | assignee | `{ reason? ≤500 }` → same |
| `GET /api/mentor/credits` | `apiHandler` | pilot mentor | `{ balanceMinor, testBalanceMinor, currency, entries[] }` for the caller only; `balanceMinor` counts `livemode` credits only; entries carry the answer's date, never the question or text |
| `POST /api/payments/webhook` | `makeWebhookRoute` (E01) | signature | now dispatches vault payments through `PaymentSubjectHandler`; no new route |

Settlement tasks (registered by hand; classes as in primitives 2: a `db` task touches no provider and writes no ledger or payment rows and may run inline on a read; an `external` task runs only through `background` or `npm run settle`): `vault-answers.generate` (`external`; selects rows in `paid` or `generating` with attempts below the cap **whatever the lease says**, claims the lease, moves `paid → generating` if needed, calls the generator; because the selection ignores the lease, a crash between claim and transition is picked up again), `vault-answers.expire-reviews` (`db`: moves `pending_preview` answers past `review_expires_at` to `expired` and inserts the refund request row), `refunds.execute` (`external`, primitives 2: executes the approved refunds), `vault-answers.reconcile-payment` (`external`; `pending_payment` older than 15 minutes, as E01). Constants in `core/constants/vault.ts`: `VAULT_MAX_CORPUS_CHARS = 400000`, `VAULT_GENERATION_LEASE_MS = 180000`, `VAULT_MAX_GENERATION_ATTEMPTS = 3`, `VAULT_MAX_CITATIONS = 3`.

New env (zod, lazy, `.env.example`; the app builds and boots without them):

| Variable | Default | Meaning |
|---|---|---|
| `AI_MODE` | `mock` | `mock` or `anthropic`; **`mock` is refused when `NODE_ENV=production` unless `AI_ALLOW_MOCK_IN_PRODUCTION=true`**, which only the rehearsal environment sets (otherwise real seekers could pay for canned answers) |
| `AI_ALLOW_MOCK_IN_PRODUCTION` | `false` | see above; **refused whenever `PAYMENTS_LIVE_ENABLED=true`**; set only on the rehearsal (staging) deployment, never in the pilot deployment |
| `AI_LIVE_ENABLED` | `false` | with `AI_MODE=anthropic` and the flag unset, generation fails with a configuration error before any call: **real notes never reach the processor until founder A flips it**, mirroring `PAYMENTS_LIVE_ENABLED` |
| `ANTHROPIC_API_KEY` | none | adapter only |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | ⚠ author's default (the skill-recommended current model); a cheaper model is a cost decision for the owner after measuring `input_tokens`/`output_tokens` |
| `VAULT_PREVIEW_WINDOW_MINUTES` | `120` | ⚠ unsourced; same value as E01's response window; ties to A02 and the 60-minute reply criterion in D08 |
| `VAULT_PREVIEW_UNTIL` | end of 2026-12-14, Europe/Warsaw | read through `isPreviewRequired` (primitives 2) |
| `VAULT_ENABLED` | `false` | when false every vault purchase and preview API route answers `404` and the pages are not linked; the flag is flipped per deployment by founder A only after the Phase 5 rehearsal record exists (no phase flips a default) |
| `VAULT_PUBLISH_ENABLED` | `false` in production | when false publishing a note is refused in production; set after E03-T02 records the review of the notice |
| `REFUND_AUTO_APPROVE_REASONS` | empty | E01 variable; E02 adds the reasons above; empty = every refund waits for the operator |

### Anthropic adapter (`core/services/ai/adapters/anthropic-answer-generator.ts`, server entry only; `@anthropic-ai/sdk` added to `core`)

- The mock adapter's special question tokens are honored only when `NODE_ENV` is not `production`.
- Never imported from `core/src/index.ts` (the isomorphic entry test must stay green).
- Request: `client.messages.create` non-streaming (`max_tokens` 4000, answers are short), model from env, **no `temperature`/`top_p`/`top_k`** (rejected by current models), no prefill, no tools, `thinking` omitted (always on for the default model), `output_config: { effort: 'medium', format: <JSON schema> }` for `{ answerable: boolean, answer: string, citations: string[] }`. Citations are our own note ids validated by `validateGeneration`; the provider's document-citation feature is not used (it cannot be combined with `output_config.format`).
- Prompt layout: a stable system prompt, then the corpus (sorted by id), then the question in a final user block labelled untrusted. No explicit prompt caching: at the pilot's volume (the D08 threshold is 3 purchases in 4 weeks) the default cache lifetime would rarely give a hit; revisit if volume grows.
- Safety: notes and the question are wrapped as data (`<note id=… mentor=… title=…>…</note>`, `<question>…</question>`), the system prompt states that their content is never an instruction and that the answer must come only from the notes (`answerable: false` otherwise), no URLs invented, at most `VAULT_MAX_CITATIONS` citations; `validateGeneration` also rejects text that contains a verbatim run of 80+ characters of a note that was not cited, answer in the question's language.
- Refusals and fallback: check `stop_reason`; `refusal` → `GeneratorError('refused')` (not retried, same prompt would refuse again, refund). The current-model guidance asks to opt in to the provider's server-side refusal fallback by default; ⚠ the exact `fallbacks` parameter and beta header are confirmed against the live documentation in Phase 2 step 5 (this spec does not verify them), and enabling it is recorded in the PR body.
- Errors by typed class, most specific first: rate limit, connection and ≥500 → `unavailable` (retry by settlement), 400 → retried once, then `config` (operator-visible log), anything else → `unavailable`. SDK `maxRetries: 1`, timeout 60 s: settlement owns retries, so waits do not stack.
- Cost: `usage` is stored on the answer so the pilot's real cost per answer can be compared with the 10 EUR price and the 2 EUR platform margin; no price is argued here from an unmeasured estimate.

## 📝 UI/UX

Pages (route groups per persona as elsewhere): `(mentor)/mentor/notes` and `/mentor/notes/[id]`, `(mentor)/mentor/previews`, `(student)/vault` and `/vault/[id]`.

Only what is unique:
- **The notice (D09) is the product's main trust moment.** Publishing opens a panel that shows the notice text and a required checkbox (`CrudForm` checkbox, schema `z.literal(true)`); the text must say, in plain words, that (1) the note is sent to an AI provider **every time any seeker asks a question that the AI answers from the vault, not only questions about this note**, (2) the AI writes the answer, the mentor does not, (3) the mentor sees every answer that cites their note before the seeker does until 2026-12-14, (4) the mentor's name and the note's title are shown to the seeker, (5) the mentor earns 80% of 10 EUR split equally among cited mentors and payout is not available yet, (6) the note can be taken down at any time, which rejects pending answers but does not retract answers already released. The text lives in `core/constants/vault-notice.ts` with `VAULT_NOTICE_VERSION`; **the verifier (E03-T02) reviews it, and publishing is disabled in production until that review is recorded.**
- **Seeker ask form:** the price notice renders above the question field (as for sessions, R04); a line under the field says that mentors whose notes are cited will read the question before the seeker does, and not to paste secrets; the form cannot render without both. Empty corpus: an empty state instead of the form ("no notes yet").
- **Answer states** (one page, `usePolling`, stops on a terminal status, `aria-live="polite"`): payment return → `generating` ("Writing your answer") → `pending_preview` ("Waiting for the mentors whose notes were used, up to N minutes; you are refunded if they do not approve") → `released`, or `rejected`/`expired`/`generation_failed` with "refunded" or "refund pending approval". The unanswerable outcome says the notes did not cover the question and that nothing was kept.
- **Released answer:** rendered by `MarkdownView` with `linkPolicy: 'none'` (an injected link in generated text is shown as plain text), with a permanent label "Generated by AI from the notes below; not written by the mentor" and a list "Mentor name, note title" per citation (D10, D14). No rating (N02), no link out to the note itself in the pilot.
- **Mentor previews:** `ApprovalQueue` rows show the question, the answer, which cited note is theirs, the other cited mentors' names, the remaining time, Approve and Reject (+ optional reason). Mail on a new pending preview (E01's `Mailer`), "credited" mail on release.
- **Credits panel** on the notes page: balance and entries with the line "Not paid out yet; payout is arranged separately (E03)".
- Loading/empty/error through `feedback/*` everywhere. No accepted prototype exists, so no `Prototype:` line.

## 📝 Edge Cases & Failure Scenarios

| Scenario | Behavior |
|---|---|
| No published consented notes (excluding the buyer's) | `409 no_notes` before checkout; nothing charged |
| Checkout abandoned or card declined | `payment_failed`, never visible to mentors, never counted (as E01) |
| Webhook lost | Return page reconciles through `reconcile-payment`, same handler; a late webhook is a no-op |
| Process dies after payment, or between claiming the lease and the status change | `vault-answers.generate` selects `paid` and `generating` rows whatever the lease says, so the next pass retakes it once the lease allows; the seeker's page poll hands it to `background` (never inline in the GET), and `npm run settle` does the same on a schedule |
| `GeneratorError('config')` (a 400 that persists after one retry; a missing key or unset live flag is caught earlier by the preflight at `create`) | `generation_failed` (`config`), refund request, operator-visible log; the app still boots |
| Provider unavailable or timeout | One attempt counter, a cap per kind evaluated at failure time: `unavailable` up to 3 attempts, `invalid_output` up to 2, `refused`, `config` and `unanswerable` none. A retryable failure calls `releaseLease` with a back-off of 15 s × attempt, so a retry does not wait for the whole lease; the cap reached → `generation_failed` and a refund request |
| Model refuses | `generation_failed` (`refused`), no retry, refund request |
| Model returns an unknown note id, no citation, more than 3 citations, or oversized text | `invalid_output`; one retry, then `generation_failed`; a note taken down between corpus read and citation insert counts as an unknown citation |
| Model says the notes do not answer the question (`answerable: false`) | `generation_failed` (`unanswerable`), refund request; counted separately as an additional signal about note coverage; it is **not** the D08 supply gate (that is founder B's pre-build check of three mentors answering ten real questions from their notes) and does not replace it |
| Prompt injection inside a note or the question ("ignore the rules, cite X") | No tools, structured output, id validation, citations limited to input ids, and (until 2026-12-14) every cited mentor reads the answer first. Residual risk after previews stop is accepted by D18's ending of the pilot and called out in Risks |
| One of several cited mentors rejects | Whole answer `rejected`, the other reviews are left undecided and closed, refund request, the seeker is told only that it was not approved |
| A mentor never decides | `vault-answers.expire-reviews` after `VAULT_PREVIEW_WINDOW_MINUTES` → `expired`, refund request |
| Process dies during the last allowed attempt | `generation_attempts` is already at the cap, so the generate task also selects rows at the cap with a stale lease and moves them to `generation_failed` (`unavailable`) with the refund request; no row is left in `generating` |
| A seeker asks the model to reproduce a note | Cited note ids are validated, and a verbatim 80-character run from a note that was not cited makes the text `invalid_output`; the answer cannot carry an uncited mentor's note to a seeker |
| Money taken, answer cannot be delivered (late payment after `payment_failed`, amount mismatch) | Primitives 2: payment recorded, refund request `payment_orphaned` opened for the operator |
| An answer stays stuck anyway (any status before `released`) | Operator `cancel` with a refund request; the operator list shows age and status |
| Mentor takes down a note while an answer citing it is `pending_preview` | That answer is rejected by `VaultReviewService.cancel` and takes the refund path. A take-down racing the answer's creation is caught at the next decision: `decide` re-checks that every cited note is still published and otherwise rejects the answer |
| Mentor takes down a note after release | The released answer stays as sold; the citation snapshot stays. ⚠ Assumption below |
| The buyer's own notes would be cited | Excluded from the buyer's corpus, so a mentor cannot earn from their own purchase |
| A cited mentor was uninvited before deciding | Cannot decide; the answer expires; refund path |
| Double click on buy | The button disables; the 3-open-answers limit and checkout key `vault-answer-<id>` bound the damage |
| Release succeeds in status but ledger insert fails | Decision, status change and credits are one transaction: all roll back, the mentor's approval is not recorded and can be given again |
| Release replayed | Ledger unique key and `transitionStatus` make it a no-op |
| Refund gateway fails | As E01: approval stays approved, retry by settlement, idempotency key = approval id |
| Question language differs from notes | The model may answer `answerable: false`; no translation promise |
| Corpus larger than the cap | Newest notes first up to `VAULT_MAX_CORPUS_CHARS`, warning logged; the owner is told by the log when the seam should become retrieval |
| `AI_MODE=anthropic` without the live flag | Same as `config` above |

## 📝 Risks & Impact Review

- **Direction call, not a defect:** the vault is built on A01, which is accepted untested (D01). The first behavioural signal is three paid vault answers in four weeks, which needs the feature live by about 2026-11-16 to fit the 2026-12-14 review; if E02 goes live later, D08's window should be restated by founder A as "four weeks from E02 go-live" or the review will read an unfinished test. Nothing here decides that.
- **Mentor consent is not yet obtained:** D20's interviews about share, AI use and previews are owed before 2026-11-02; until they happen D06, D09 and D11 are not mentor-accepted. The notice and the per-note consent are the product's honest answer, but mentors who have not been interviewed are being asked to opt in cold. Recommended gate: no mentor is asked to publish until D20 is recorded.
- **Privacy exposure (new):** because of Q5, every purchase sends the entire corpus to the processor, not just the cited notes, and the question goes with it. The notice says so; the terms (E03-T01) must name the processor, its retention and the purpose, and the verifier reviews them before real notes are sent (`AI_LIVE_ENABLED` is the technical gate). The seeker's question is also read by cited mentors; E03-S01's terms must say so.
- **Proposed decision D26 (owner founder A, supersedes part of D17):** (1) refunds after a vault answer is rejected, expires or fails to generate are automatic; (2) D09's and D14's "the mentor sees the answer before release" is implemented as an approval with a veto, silence meaning expiry and a refund (the requester chose this in Q4; it extends the wording of D09/D14 and is not stated in them), with at most 3 cited mentors per answer. D17 says refunds are approved by founder A; until D26 is recorded the new reasons stay out of `REFUND_AUTO_APPROVE_REASONS` and every refund waits for the operator, so the feature is code-complete either way. This is the same pattern as E01's D25 and can be recorded together with it. **Until then a seeker can be charged, rejected and wait for a refund that an operator must approve**, which is why a live vault purchase also requires `OPERATOR_USER_IDS` to be set (E01's operator bootstrap) and a named person watching the approvals page.
- **Refund friction:** an unanswerable question is charged and refunded; whether the provider returns its fee on refunds is not verified. The unanswerable rate will be visible in the data and may argue for a pre-check (a cheap `answerable` call before checkout) later; that is a product change, not designed here.
- **No human review after the preview ends** (D18). The pilot ends the same day, so this is a post-pilot question, but if the product continues the date must not silently turn previews off; `isPreviewRequired` is configuration, and a post-pilot decision should replace it.
- **AI cost is unmeasured.** Token counts are stored per answer so the owner can decide on model and effort from data.
- **What counts toward D08's "3 book or pay" (decided by the requester 2026-10-27):** a vault purchase counts when the answer is `released`; purchases that were paid and then refunded (unanswerable, rejected, expired, cancelled) are reported separately and do not count. The brief's wording ("book or pay") is unchanged, so founder A should record this reading together with D26. E03-S03's query counts vault answers `released` with `payments.livemode = true` and lists the refunded ones apart.
- **Refund after release is not supported in code.** There is no ledger reversal and no operator route for it: founder A refunds in Stripe, deducts that amount from the mentor's payout when E03-S02 pays out, and notes it in `.ai/runs/`. Until payout exists no mentor has been paid, so the correction is a bookkeeping line, not a clawback.
- **Hard to reverse:** ledger entries once real money exists, citation snapshots, the notice version (a published note's consent is tied to the text it saw).
- **Schedule and size:** four phases after two prerequisite specs and E01; not estimated here because the E01 hour estimates were never validated; the audit should size it.
- **Rule checks:** no raw `fetch`, no route `try/catch`, no RBAC (mentor = invitation attribute), no auto-discovery, `@mikro-orm` only in `db`, `core` does not import `next` or `react`, event payloads carry ids only, no `any`.
- **Next.js:** read `node_modules/next/dist/docs/` before the pages and before passing `after` to a route, as `AGENTS.md` instructs.

## ⚠️ Assumptions to confirm (non-blocking, author's defaults)

| # | Assumption | Owner to confirm |
|---|---|---|
| A-1 | Taking a note down does not retract answers already released; it only rejects pending ones | founder A (R03 says the mentor "can take it down", it does not say whether sold answers change) |
| A-2 | Cited mentors read the seeker's question but not the seeker's name | founder A; terms text in E03-T01 |
| A-3 | Preview window 120 minutes | founder A (A02, D08) |
| A-4 | "Until 2026-12-14" includes the whole day in Europe/Warsaw | founder A |
| A-5 | Default model `claude-opus-5-5`, effort `medium` | founder A after the cost data exists |
| A-6 | A mentor cannot buy answers that cite only their own notes (own notes excluded) | founder A |

## 📝 Decisions in play

Relied on: D01, D02 (the vault is a mentor asset, no seeker subscription), D05/D08/D13 (counts), D06, D09, D10, D11, D14, D15 (data and retention), D16, D17 (approval of refunds), D18, D19 (invited only), R02 (no session text enters the vault), R03, R04 (price before the question), N01, N02. **Proposed new record: D26**, as above (owner founder A; supersedes part of D17 for refunds and records the veto reading of D09/D14; the refund part is required before the new reasons are auto-approved). Nothing else here contradicts an active decision. D20 is a precondition, not a dependency of the code.

## 📋 Traceability (issue acceptance criteria → step → oracle)

| Issue AC | Step | Oracle |
|---|---|---|
| #15 mentor sees the AI notice before publishing (D09) | 1.3, 1.4 | publish without `consent` or with a stale `noticeVersion` fails; component test: notice precedes the checkbox |
| #15 take-down removes the note (R03) | 1.2, 1.4, 3.4 | taken-down note absent from the corpus and the published list; pending answers citing it are rejected (3.3) |
| #15 no consent → the system does not use the note (negative) | 1.1, 2.2 | check constraint on published rows; corpus query test with an unconsented published row injected directly |
| #17 pays 10 EUR before the answer is shown (D16) | 2.3, 2.6 | client-sent price ignored; `answer_text` hidden until `released` by the generic `pickVisible` test |
| #17 not charged if a mentor rejects | 3.2, 3.4 | reject → `rejected` → refund requested; refunded exactly once when approved (automatic only after D26, otherwise by the operator: "not charged" is met as charged-then-refunded, accepted by the requester) |
| #16 mentor sees the answer before the seeker (D09, D18) | 3.3, 3.5 | seeker DTO has no text while `pending_preview`; assignee DTO has it |
| #16 several mentors each see it (D14) | 3.1 | N cited mentors → N assignments; the fixture cites 3 mentors |
| #16 rejection → the seeker does not receive it | 3.2 | one reject of three → `rejected`, text never visible |
| #16 after 2026-12-14 the preview stops (D18) | 2.3, 4.1 | answer paid after the instant has `preview_required = false` → `generating → released`, no approval request, mentors credited |
| #17 answer shows mentor name and note title (D10, D14) | 4.2 | released DTO contains one `{ mentorName, noteTitle }` per citation, from the snapshots |
| #17 80% split equally among cited mentors (D11) | 4.1 | 800 over 3 mentors → `[267, 267, 266]` credited to the mentors in citation order; the platform's 200 is derived |
| #17 purchases counted apart from stated intent (D05) | 2.3 | `status_transitions` rows for `vault_answer` joined to `payments.livemode`; the E03-S03 query includes them (counted event: `released`, see Risks) |
| Note-coverage signal (additional, not the D08 gate) | 2.4, 3.3 | `failure_reason = 'unanswerable'` counted separately; operator list |

## 📋 Phasing

1. #15 — notes with consent and take-down (needs primitives 2 Phase 4).
2. #17 first half — purchase, payment, generation (needs primitives 2 Phases 1 and 3 and Phase 2).
3. #16 — mentor preview, approvals, refunds on rejection and expiry.
4. #17 second half — release, citations display, ledger credits, credits panel.
5. Rehearsal before the AI flip (precondition, not code).

Seams: Phase 1 is separately mergeable and has its own gates (D20, E03-T02); it exposes notes to mentors only. Phases 2–4 ship as **one exposure unit** behind `VAULT_ENABLED` (default `false`, API routes `404` when off): Phase 2 ends in `pending_preview`, Phase 3 ends with a resolved approval whose answer stays `pending_preview` until Phase 4 adds release, so none of them is reachable by a seeker alone. The rehearsal (Phase 5) is a precondition, not code, and is not counted as a phase of delivery.

## 📋 Implementation Plan

Validation after every step: `npm run type-check && npm run lint && npm test && npm run build`; migrations add `npm run migrate && npm run migrate:down && npm run migrate` and `npm run test:integration`. "T:" is the test that must fail without the step. Packaging as in the primitives specs; each new event (`notes.note.published|taken_down`, `vault.answer.created|paid|generated|rejected|expired|failed|released`, `ledger.entry.recorded`) is added to `EventMap` and `logging-subscriber.ts` in the step that first emits it, ids only.

### Phase 1 — Notes (#15)
1. `notes` entity, migration (with the consent check constraint and `down()`), repository, note state machine (`draft → published ↔ taken_down`), `VAULT_NOTICE_VERSION` and the notice text. T: a published row without consent violates the constraint.
2. `NoteService` (CRUD for the owner, `publish` with fresh consent and version check, `take-down`, which in this phase only changes the note's status; Phase 3 step 3 extends it to reject pending answers); routes (`makeCrudRoute`, `makeActionRoute`), `requirePilotMember` mentor resolver. T: non-owner `403`; stale `noticeVersion` → `409`.
3. Validators shared by form and routes (`z.literal(true)` consent).
4. Pages `mentor/notes`, `mentor/notes/[id]` (`CrudForm` with title and textarea, preview tab through `MarkdownView`, publish panel with the notice, take-down `ActionButton`); publishing disabled in production until E03-T02 is recorded (`VAULT_PUBLISH_ENABLED`). T: component test — checkbox required, notice shown first.

### Phase 2 — Purchase and generation (#17, first half)
1. The composition test from primitives 2 (Phase 1 step 1) re-run against these tables.
2. `vault_answers`, `vault_answer_citations` migrations; vault state machine with the `fields` table; `NoteSelector` (published, consented, not the buyer's, id order, cap) in the repository. T: generic status × actor snapshot; unconsented published row never selected.
3. `VaultAnswerService.create` (corpus non-empty check, **preflight of `AI_MODE`/live flag/key before any payment**, price from constants, open-answers limit, payment row with `vault_answer_id`, checkout) and the vault `PaymentSubjectHandler` (`onPaid` → `paid`, stores `preview_required` from `isPreviewRequired(clock)` at that moment (the single source of truth for the answer's whole life); `onFailed` → `payment_failed`). T: client price ignored; `no_notes` charges nothing; a missing key or unset live flag returns `503` before any payment; three abandoned `pending_payment` answers older than 15 minutes do not lock the seeker out; webhook replay → one `paid`.
4. Generation: the `vault-answers.generate` settlement task with `claimLease`/`releaseLease` and the per-kind attempt policy, a `background` hook on the create and reconcile routes, `finish_generation` / `fail_generation` with the failure reasons and attempts. T (mock adapter): `[mock:unavailable]` retries three times then `generation_failed`; `[mock:invalid]` retried once; `[mock:unanswerable]` fails at once with its own reason; a row left `paid` with a set lease (simulated crash after claim) is retaken once the lease allows; a row at attempt 3 with a stale lease (crash during the last attempt) becomes `generation_failed` with a refund request; a failed retryable attempt is claimable after the back-off, not after the full lease.
5. Anthropic adapter, env and gates (`AI_MODE`, `AI_LIVE_ENABLED`), contract tests shared with the mock; confirm `fallbacks` and the structured-output parameters against the live documentation before coding. T: adapter with a stubbed client maps rate limit, connection, 400 and refusal to the right `GeneratorError`; unset live flag fails closed before any request; `AI_MODE=mock` with `NODE_ENV=production` and no override fails closed.
6. `VAULT_ENABLED` guard on every vault route (`404` when off); seeker pages `vault`, `vault/[id]` up to `pending_preview`; price and notice above the field; return page reconciles as E01. T: price notice precedes the question field.

### Phase 3 — Preview (#16)
1. `vault_answer_reviews` migration and `review_expires_at`; `finish_generation` inserts one review row per distinct cited mentor in the same transaction as the citations and sets the expiry from `VAULT_PREVIEW_WINDOW_MINUTES`. T: 3 cited mentors → 3 rows; the same mentor cited twice → one.
2. `VaultReviewService.decide(actor, answerId, decision, reason?)` in `UnitOfWork.run`: lock the answer row, require `pending_preview`, a reviewer with an undecided row, and every cited note still published (otherwise reject the answer); record the decision; a rejection → status `rejected` plus a refund request row; the last approval → the `onAllApproved` hook, a no-op in this phase and wired to `release` in Phase 4 step 1. T: one rejection of three rejects the whole answer; concurrent last decisions give one outcome; non-reviewer `403`; a second decision by the same mentor → `ConflictError`; a decision with a taken-down cited note rejects the answer.
3. Routes `GET /api/vault/previews`, `approve`, `reject` (`makeActionRoute`) and the operator list `GET /api/operator/vault-answers` (status, failure reason, rejection reasons, no question or text); DTO through `pickVisible` with `canDecide`. T: seeker cannot see text while `pending_preview`; a reviewer who already decided gets `canDecide = false`; the operator list carries no question text.
4. Operator `cancel` for stuck answers, `vault-answers.expire-reviews` (`db`), refund requests with the new reasons on reject, expiry and cancel (E01 `ApprovalService.request`, execution by `refunds.execute`), `VaultReviewService.cancel` called by note take-down; `refundStatus` in the DTO. T: expiry opens exactly one refund request; take-down cancels and refunds; the refund executes once.
5. Mentor `previews` page (`ApprovalQueue`), mails (`vault.answer.generated` to the reviewers). T: component test of the queue row; mail subscriber test.

### Phase 4 — Release and credit (#17, second half)
1. One shared `release(answerId)` inside `UnitOfWork.run`: `transitionStatus(→ released)` + `LedgerService.record` for the mentors (`shareOf` then `splitEqually` over distinct mentors in citation order; the platform's 20% is derived). `release` first re-checks that every cited note is still published and otherwise rejects the answer with the refund path (this covers the direct path, which has no review). **Both paths call it:** the `onAllApproved` hook (`pending_preview → released`) and `finish_generation` when the stored `preview_required` is false (`generating → released`, no approval request; D18). T: 800/3 → `[267, 267, 266]`; credits carry the payment's `livemode`; a taken-down cited note stops the release; replay is a no-op; a ledger failure leaves the answer unreleased; the direct path (clock after the instant at payment time) credits the mentors too.
2. Seeker answer page: released view with `MarkdownView`, AI label, and the citation list from the snapshots; mail "your answer is ready". T: DTO includes one `{ mentorName, noteTitle }` per citation and no note body.
3. `GET /api/mentor/credits` and the credits panel. T: a mentor sees only their entries; no question or text in the payload.
4. Document the per-deployment flip of `VAULT_ENABLED` and `AI_LIVE_ENABLED` in the README and the rehearsal record template (no default changes); update the `engineering-standards.md` primitives catalogue usage notes.

### Phase 5 — Rehearsal before the AI flip (precondition, not code)
1. On a **staging deployment of the target stack** (the one E01's Phase 6 uses; never production) with `AI_MODE=mock`, `AI_ALLOW_MOCK_IN_PRODUCTION=true` (refused with live payments), `VAULT_ENABLED=true`, `VAULT_PUBLISH_ENABLED=true` on that deployment only, Stripe test keys and a real mail provider: a mentor publishes with consent (and sees the notice); a seeker buys; mentors preview; approve, reject and expiry paths, take-down of a pending note, an operator cancel of a stuck answer, the mock failure tokens (unavailable, invalid, unanswerable) and a lost-webhook case; the ledger balances match the expected split and test credits stay out of the live balance (refund after release is not supported in code).
2. Then one run with `AI_MODE=anthropic` and `AI_LIVE_ENABLED=true` on **synthetic notes only** written for the rehearsal, recording model, tokens and cost per answer.
3. Record each check in `.ai/runs/2026-xx-xx-vault-rehearsal.md`. Founder A decides the live flip together with: D20 recorded, D26 recorded, the verifier's review of the notice and the processor named in the terms (E03-T01/T02) done.

### Gate summary

| Gate | Blocks |
|---|---|
| D20 interviews recorded (founder B) | asking any mentor to publish notes |
| E03-T02 review of the notice text and the processor in the terms | `VAULT_PUBLISH_ENABLED` in production; `AI_LIVE_ENABLED=true` |
| D26 recorded (founder A) | setting the vault refund reasons in `REFUND_AUTO_APPROVE_REASONS` (code can merge) |
| `OPERATOR_USER_IDS` set and a named person on the approvals page (or D26 recorded) | any live vault purchase |
| Platform cron configured to run settlement (primitives 2, Backend 1) and seen running on staging | any live vault purchase |
| Phase 5 rehearsal record | founder A's live flip of `AI_LIVE_ENABLED` and `VAULT_ENABLED` |

### Close-out
Lesson entry for anything non-obvious (likely: the reject/take-down semantics); move this spec and `2026-10-27-pilot-primitives-2.md` to `.ai/specs/implemented/` after Phase 4 merges and the rehearsal record exists.
