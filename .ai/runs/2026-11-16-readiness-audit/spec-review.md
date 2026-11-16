# E01 independent specification review

- Initial reviewer: GPT-6.1 Terra
- Remediation editor: GPT-6 (Codex)
- Re-review: multiple passes; final static pass found one payment-state blocker, now addressed; final confirmation pending
- Date: 2026-11-16
- Scope: `.ai/specs/2026-10-26-pilot-primitives.md`, `.ai/specs/2026-10-26-pilot-booking-flow.md`, `.ai/specs/2026-11-15-platform-settings.md`, and their product-brief dependencies
- Method: static review against current repository code and the product brief; no app/test execution

## Initial verdict

Revisions requested. The reviewer found:

1. **First invitation link — high.** The invitation flow appeared to require acceptance before the first link could be requested, although the first link use creates the account. The booking spec now states that an unrevoked invitation permits link issuance and that first successful, single-use link consumption atomically creates the account and accepts/attaches the invitation role.
2. **Price changes after display — high.** A mentor could change the price after it was shown. The pricing spec now requires a transactional price-revision precondition; mismatch returns 409, persists no booking/payment, and requires the user to refresh and reconfirm.
3. **Session start versus response deadline — high.** The 120-minute response window could extend beyond the reserved session start. The booking spec now sets the deadline to the earlier of the configured response deadline and slot start, forbids slots without a minimum response window, and requires an atomic accept/expire transition and idempotent settlement.
4. **Bounds/mentor-price write race — medium.** The pricing spec now requires both write paths to lock the same settings row and serialize their transaction, with a race acceptance criterion.
5. **D16 traceability — medium.** The product brief now records the approved partial supersession: mentor-set PLN session prices within bounds, initial amounts unchanged, vault-answer price unchanged, no platform fee; market/rate evidence remains unvalidated.
6. **Supersession scope — medium.** The booking spec's original whole-document supersession note still needs to be reconciled with later E01 stories that remain in force. The pricing spec's stated three-section supersession remains the narrower authority.

## Evidence and limits

The reviewer confirmed the current `MagicLinkService.issue` accepts an unrevoked invitation and noted existing booking code already rejects acceptance after the slot start. The new text makes these conditions explicit in the requirements and adds test oracles; it does not claim that every listed future price requirement is implemented in production code.

Original author model metadata was absent from the reviewed specs. The independent reviewer is a different configured model from this remediation editor, but that does not prove the original spec authorship. The registry preserves this limitation. Re-review is pending.


## Follow-up to second review

The reviewer found that `payment_failed` is terminal while late success still needs a refund, and that an unconditional slot release could free a slot already claimed by another seeker. The booking spec now defines payment-only `late_success_refund_pending`/`refunded_late` compensation without reactivating the terminal booking, stores an immutable first verified-success receipt and unique provider event/payment identifiers, and releases a slot only when its `booking_id` still matches. The exact checkout cutoff is inclusive (`receipt <= starts_at - 30 minutes`); later is late. Required tests cover duplicate/out-of-order webhooks, delayed reconciliation, the new booking claiming the slot before compensation, conditional release, and exactly-once refund.

At the time of review, D27 was provisional. The requester subsequently confirmed founder A approval on 2026-11-16; the canonical decision is now recorded in `.ai/specs/research/decisions/D27-mentor-set-session-prices.md` and the product brief. This approval does not imply implementation or market validation.


## Final reviewer result

GPT-6.1 Terra returned **PASS** for the amended scope covering late payment, terminal booking states, conditional slot release, and the inclusive checkout cutoff. The reviewer confirms the original author model remains unknown, so independence from the original authors cannot be proven; the GPT-6 remediation text itself was reviewed by the distinct GPT-6.1 Terra model. D27 was later approved by founder A and recorded as a separate product decision; that approval is neither an implementation result nor market validation.
