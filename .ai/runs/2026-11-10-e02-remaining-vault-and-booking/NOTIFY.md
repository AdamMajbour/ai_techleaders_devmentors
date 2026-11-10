# NOTIFY
- 2026-11-10T12:20:00Z — Scope decision: user clarified they mean choose a concrete available time; E01 spec updated as Q9 in commit 6db598e.
- 2026-11-10T12:21:00Z — Started independent selected-time booking slice on stacked worktree `feat/e02-remaining-vault-slots`; remaining vault still depends on missing primitives 2.
- 2026-11-10T12:45:00Z â€” Checkpoint 1: selected-time booking implementation complete; type-check, lint, check:agents, full unit suite, and production build passed. PostgreSQL integration tests are blocked by local password authentication for `postgres`; browser pass skipped because shared test env descriptor is absent and the DB is unavailable. Recorded in `checkpoint-1-checks.md`.
