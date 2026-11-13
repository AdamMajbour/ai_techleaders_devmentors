# Inferred session notes (E04 S02–S04)

Status: implementation assumptions; the requested `.ai/specs/2026-10-01-sessions-notes.md` was not present in the checkout or git history. E04 is marked later/reserved in `.ai/specs/backlog.md`; this document records the smallest implementation inferred from current product decisions, not an owner-approved replacement specification.

## Evidence and boundaries

- The product brief glossary describes a session note as written after a session, owned by the mentor and visible to the seeker; public visibility requires seeker approval.
- R02 says nothing from a session is published without seeker approval, and the mentor retains a way to take notes down.
- E02's vault spec explicitly excludes session notes from its AI corpus. This implementation does not expose notes to E02.
- E01's booking and messaging flows are specified but absent from this checkout. Consequently no code here proves a session exists or that its seeker is a participant. `sessionId` is only an opaque UUID; current endpoints are mentor-owner only. Participant reads and seeker approval must be connected to E01 before seeker visibility can ship.

## Implemented interim behavior

Mentors can create, list, edit, and delete their own notes. Notes are private by default. Editing clears recorded approval. The persistence model stores an approval timestamp and withdrawal timestamp for future participant-authorized flows, but no current endpoint accepts seeker approval or serves notes publicly. The model is separate from standalone E02 mentor-authored vault notes.

## Assumptions

- A note has one title and markdown/plain-text body; body max 20,000 characters and title max 160.
- A note is associated with one session UUID; session lifecycle does not yet exist here.
- The mentor is the note author, derived from the authenticated session, never request input.
- Consent must be explicit, attributable to the seeker, and revocable. The current schema's timestamp-only fields are insufficient audit evidence; E01 integration should add a dedicated approval actor/source or approval record before implementing the seeker's action.
- No automatic publication, AI use, cross-session search, export, notifications, or retention job is implemented. Retention should follow the pilot terms (session text and notes through 2026-12-14 plus 30 days, unless publication is approved), but no deletion scheduler exists in this repository.

## Follow-up required

1. Implement E01 bookings and participant authorization.
2. Add seeker-only read of their session notes and explicit approval/revocation bound to the seeker participant; record actor and timestamps.
3. Add retention/deletion behavior consistent with D15 and approval exception.
4. Resolve exact S02–S04 acceptance criteria from the missing spec or product owner before broadening behavior.
