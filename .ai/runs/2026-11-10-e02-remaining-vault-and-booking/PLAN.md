# E02 remaining slices + selected-time booking — 2026-11-10

## Tasks

| Phase | Step | Title | Exec | Status | Commit |
|---|---:|---|---|---|---|
| Gate | 0.1 | Reconcile specs, upstream branches, and predecessor | inline | done | — |
| Phase 1 | 1.1 | Extend E01 spec with requester-approved selected-time booking | inline | done | 6db598e |
| Phase 1 | 1.2 | Add persisted slots, owner APIs, atomic booking reservation, and terminal-state release | inline | done | 08a3b35 |
| Phase 1 | 1.3 | Build mentor slot manager and seeker timezone-aware slot selector | inline | done | e16e4af |
| Gate | 1.4 | Finish slot integration evidence and update issue #8 | inline | done | pending |
| Phase 2 | 2.1 | Add UnitOfWork, visibility fields, leases and route background hooks | inline | done | 2b42088 |
| Phase 2 | 2.2 | Add generic payment subjects and vault refund queue support | inline | done | c6ad00b |
| Phase 2 | 2.3 | Add exact money helpers, append-only ledger, AI adapters and preview cutoff | inline | done | 0b6adc9 |
| Phase 2 | 2.4 | Reuse safe MarkdownView, CrudForm checkbox and ApprovalQueue | inline | done | 321e28d |
| Phase 3 | 3.1.1 | Add vault answer, citation and review schema/migration | inline | done | c6ad00b |
| Phase 3 | 3.1.2 | Implement seeker purchase, payment reconciliation and local checkout | inline | done | pending |
| Phase 3 | 3.1.3 | Implement lease-backed generation, validation, retries and snapshots | inline | done | pending |
| Phase 3 | 3.2.1 | Implement mentor preview assignment and approval/rejection | inline | done | pending |
| Phase 3 | 3.2.2 | Implement expiry, cancellation and operator refund requests | inline | done | pending |
| Phase 3 | 3.3.1 | Release only after required approvals; credit cited mentors atomically | inline | done | pending |
| Phase 3 | 3.3.2 | Implement seeker result, citations and mentor credits views | inline | done | pending |
| Phase 3 | 3.4 | Operator controls and deployment/scheduler documentation | inline | done | pending |
| Gate | 4.1 | Type/lint/unit/full gate, DB/browser evidence, review and stacked PR readiness | inline | in-progress | — |

## Goal
Deliver selected-time mentor booking plus E02-S02/S03 on a branch stacked on E02-S01 PR #29.

## Dependencies and scope
- Q9 in the E01 spec records the requester-approved 2026-11-10 scope change. The slot phase is independently implementable; remaining vault work is stacked with primitives and E02-S01.
- Slots are discrete 25-minute UTC intervals published within the next 7 days and displayed in the seeker's local timezone. No recurring availability, external calendar sync, or rescheduling.
- Preserve live payment/AI gates closed by default. Refund execution remains in the existing operator approval workflow unless separately approved auto-approval reasons are configured.
- PR #29 remains draft with integration DB evidence and independent review unresolved.

## Validation
- `npm run type-check` — passed after final E2E/UI corrections.
- `npm run lint` — passed with five existing warnings; no new warnings.
- Focused vault tests — 5 suites, 19 tests passed earlier; full suite below includes them.
- Full unit suite — 119 suites, 782 tests passed.
- Storybook UI stories in JSDOM — 323 tests passed.
- `npm run build` — passed; generated routes include seeker vault, mentor preview/credits, operator vault, and availability.
- `npm run check:agents` — passed.
- `npm run test:integration -- --runInBand --silent` — 49/49 passed on isolated `devmentor_test`; covers migrations, atomic selected-slot claim/release, generation lease, preview approval/credits, and withdrawn consent.
- `npm run test:e2e -- --runInBand` — 33/33 passed on dedicated `devmentor_e2e`; covers selected-time booking and mock vault purchase → cited mentor approval → released answer. Playwright/Chromium 1248 used because configured `agent-browser` is unavailable in this Windows session.
- Local QA descriptor `.ai/qa/test-env.json` is running at `http://localhost:3001`; generated up script cold/warm was verified (12s / <1s). Screenshot and evidence report are under `.ai/qa/artifacts_e02-local/`.
- Staging rehearsal, independent PR review, and product/legal gates remain open. Do not enable live flags or mark the spec implemented until they are satisfied.
