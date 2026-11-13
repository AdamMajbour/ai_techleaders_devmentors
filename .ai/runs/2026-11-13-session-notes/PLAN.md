# Session notes implementation plan

## Tasks

| Step | Task | Status |
|---|---|---|
| 1 | Add private session-note persistence, validators, service, migration and tests | in_progress |
| 2 | Expose owner-scoped API and a simple notes page | todo |
| 3 | Run repository validation, review diff, commit implementation and document assumptions | todo |

## Reconstructed scope and assumptions

The requested `.ai/specs/2026-10-01-sessions-notes.md` is absent and E04 is reserved/later in the backlog. Existing product evidence says session notes are written after a session, belong to the mentor, are visible to the seeker, and are public only with seeker approval (R02); mentors need a way to take notes down. The E02 vault spec explicitly says session notes stay out of its AI corpus.

This implementation therefore treats notes as private by default, allows the owner to record/revoke seeker publication approval, and never feeds them into E02. E01 booking/session records do not exist in this branch; `sessionId` is an opaque UUID and no participant visibility or session existence is claimed. Owner-only API access is an interim fail-closed limitation until E01 supplies participant authorization. No public endpoint is provided.
