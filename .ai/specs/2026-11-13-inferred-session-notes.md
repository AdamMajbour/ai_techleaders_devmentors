# Inferred session notes (E04 S02–S04)

Status: implementation assumptions; the requested `.ai/specs/2026-10-01-sessions-notes.md` was not present in the checkout or git history. E04 is marked later/reserved in `.ai/specs/backlog.md`; this document records the smallest implementation inferred from current product decisions, not an owner-approved replacement specification.

## Evidence and boundaries

- The product brief glossary describes a session note as written after a session, owned by the mentor and visible to the seeker; public visibility requires seeker approval.
- R02 says nothing from a session is published without seeker approval, and the mentor retains a way to take notes down.
- E02's vault spec explicitly excludes session notes from its AI corpus. This implementation does not expose notes to E02.
- E01's booking and messaging flows are specified but absent from this checkout. Consequently no code here proves a session exists or that its seeker is a participant. `sessionId` and `seekerId` are opaque UUIDs supplied by the mentor; the mentor can assign an arbitrary existing account. APIs restrict reads to the mentor and assigned seeker, but this is a provisional trust boundary, not proof of booking participation. E01 must replace it with authoritative participant resolution before production use.

## E01 booking integration (minimal local prerequisite)

Session notes now reference a booking ID and derive mentor/seeker identities from that booking. Note creation is mentor-only and requires booking status `accepted` or `completed`; read and consent are limited to the recorded participants. The local minimal booking table has participant IDs and status but no E01 transitions, payment linkage, status constraint, or authoritative ownership history. These remain prerequisites before production use.

## Implemented interim behavior

Mentors can create, list, edit, and delete their own notes, assigning a seeker account ID. Assigned seekers can read and record or withdraw approval. Editing clears recorded approval. There is no public listing or endpoint; approval is only a consent record for a future publication flow. The model is separate from standalone E02 mentor-authored vault notes.

## Assumptions

- A note has one title and markdown/plain-text body; body max 20,000 characters and title max 160.
- A note is associated with one session UUID; session lifecycle does not yet exist here.
- The mentor is the note author, derived from the authenticated session, never request input.
- Consent must be explicit, attributable to the seeker, and revocable. The current schema records approval and withdrawal timestamps but not a separate audit trail. E01 integration should validate the assignment against booking participants and retain consent history if required by product/legal review.
- No automatic publication, AI use, cross-session search, export, notifications, or retention job is implemented. Retention should follow the pilot terms (session text and notes through 2026-12-14 plus 30 days, unless publication is approved), but no deletion scheduler exists in this repository.

## Follow-up required

1. Complete E01 booking lifecycle/status constraints and payment-backed booking creation; this code supplies only participant identity and a status eligibility check.
2. Add a reviewed publication destination and enforce recorded seeker approval there; the current approval does not expose any public route.
3. Add retention/deletion behavior consistent with D15 and the approval exception.
4. Resolve exact S02–S04 acceptance criteria from the missing spec or product owner before broadening behavior.
