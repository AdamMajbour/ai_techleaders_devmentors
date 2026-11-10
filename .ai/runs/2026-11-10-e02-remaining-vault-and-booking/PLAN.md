# E02 remaining slices + selected-time booking — 2026-11-10

## Tasks

| Phase | Step | Title | Exec | Status | Commit |
|---|---:|---|---|---|---|
| Gate | 0.1 | Reconcile specs, upstream branches, and predecessor | inline | done | — |
| Phase 1 | 1.1 | Extend E01 spec with requester-approved selected-time booking | inline | done | 6db598e |
| Phase 1 | 1.2 | Add persisted slots, owner APIs, atomic booking reservation, and terminal-state release | inline | done | 08a3b35 |
| Phase 1 | 1.3 | Build mentor slot manager and seeker timezone-aware slot selector | inline | done | e16e4af |
| Gate | 1.4 | Finish slot integration evidence and update issue #8 | inline | in-progress | — |
| Phase 2 | 2.1.1 | Add UnitOfWork and state-dependent field visibility | inline | done | 2b42088 |
| Phase 2 | 2.1.2 | Add DB leases and settlement task execution | inline | todo | — |
| Phase 2 | 2.1.3 | Add route background hooks and read-triggered settlement | inline | done | — |
| Phase 2 | 2.2 | Implement generic payable subject/refund handling | inline | todo | — |
| Phase 2 | 2.3.1 | Add exact money split helpers and vault constants | inline | done | 0eca8ce |
| Phase 2 | 2.3.2 | Add append-only mentor credit ledger | inline | todo | — |
| Phase 2 | 2.3.3 | Add validated AnswerGenerator port and mock | inline | todo | — |
| Phase 2 | 2.3.4 | Add pilot preview-window helper | inline | todo | — |
| Phase 2 | 2.4 | Implement shared UI primitives required by vault | inline | todo | — |
| Phase 3 | 3.1 | Implement vault purchase and generation | inline | todo | — |
| Phase 3 | 3.2 | Implement mentor preview, approval and refund paths | inline | todo | — |
| Phase 3 | 3.3 | Implement answer release, citations and mentor credits | inline | todo | — |
| Phase 3 | 3.4 | Operator controls and deployment documentation | inline | todo | — |
| Gate | 4.1 | Full gate, review and ready stacked PR | inline | todo | — |

## Goal
Deliver selected-time mentor booking plus E02-S02/S03 on a branch stacked on E02-S01 PR #29.

## Dependencies and scope
- Q9 in E01 spec records the requester's 2026-11-10 scope change. The slot booking phase is independently implementable; remaining vault phases depend on primitives 2 Phases 1–4, absent on `develop` and the predecessor branch.
- Slots are discrete 25-minute intervals stored as UTC, published within the next 7 days, displayed in the seeker's local timezone. No recurring availability, external calendar sync, or rescheduling.
- Preserve live payment/AI gates closed by default.
- PR #29 remains draft with integration DB evidence and independent review unresolved.

## Validation
Run the configured full gate, migration integration suite, and browser checks after implementation. No claim of completed vault slices until their prerequisites are present.
