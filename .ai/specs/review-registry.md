# Specification review registry

This registry records cross-model specification reviews. A review counts only when its reviewer model differs from the author model and the review outcome is recorded. A code review or an unverified assertion does not count.

## Current evidence

| Specification | Author/model | Reviewer/model | Date | Outcome |
|---|---|---|---|---|
| `.ai/specs/2026-11-15-platform-settings.md` | Codex implementation run (exact model build not exposed) | GPT-6 Astra, independent review context | 2026-11-16 | Earlier review requested revisions; see later GPT-6.1 Terra review row for remediation PASS; D27 was subsequently approved and recorded |
| `.ai/specs/2026-10-26-pilot-primitives.md` (E01 dependency scope) | Original author/model not recorded; remediation editor GPT-6 | GPT-6.1 Terra | 2026-11-16 | PASS for reviewed E01 dependency scope; final review was static. Original authorship independence cannot be established because original model metadata is absent |
| `.ai/specs/2026-10-26-pilot-booking-flow.md` | Original author/model not recorded; remediation editor GPT-6 | GPT-6.1 Terra | 2026-11-16 | PASS for reviewed remediation: invite-first semantics, late-payment compensation, terminal booking, conditional slot release and cutoff. Static review; original-author independence cannot be established from missing metadata |
| `.ai/specs/2026-11-15-platform-settings.md` | Original author/model not recorded; remediation editor GPT-6 | GPT-6.1 Terra | 2026-11-16 | PASS for reviewed pricing-concurrency/stale-quote requirements; D27 owner confirmation was recorded on 2026-11-16; this does not claim that the feature has been implemented. Static review; original-author independence cannot be established from missing metadata |
| `.ai/specs/2026-11-15-invitation-batches.md` | Not recorded | Not recorded | â€” | No cross-model review evidence found in repository metadata |
| `.ai/specs/2026-11-13-inferred-session-notes.md` | Not recorded | Not recorded | â€” | No cross-model review evidence found; document explicitly says implementation assumptions |
| `.ai/specs/2026-11-12-pilot-terms-payouts-retention-measurement.md` | Not recorded | Not recorded | â€” | No cross-model review evidence found |
| `.ai/specs/2026-10-27-pilot-vault-answers.md` | Not recorded | Not recorded | â€” | No cross-model review evidence found |
| `.ai/specs/2026-10-26-pilot-booking-flow.md` | Not recorded | Not recorded | â€” | No cross-model review evidence found |

The original author model for the older E01 specs is not present in their metadata. The remediation pass is attributed to GPT-6 and the updated E01 requirements received a static PASS from GPT-6.1 Terra. This verifies cross-model review of the remediation, but cannot establish the original authorship. D27 is now separately confirmed and recorded in the product brief; it is not implied by the review.

## Recording a review

Add one row per specification after the independent review is complete. Record model/provider identifiers as returned by the review system, the date, and a short disposition. Link a review artifact when one exists. If the reviewer is the same model as the author, the review does not satisfy the cross-model requirement.

| Specification | Author/model | Reviewer/model | Date | Outcome | Artifact |
|---|---|---|---|---|---|
