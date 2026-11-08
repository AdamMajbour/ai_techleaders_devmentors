# Pilot rehearsal — 2026-11-06

Status: **Local infrastructure ready; Phase 6 rehearsal not started.**

Scope: run the E01 go-live rehearsal against the local app with Stripe test credentials and a real mail provider. Live payment mode must remain disabled.

## Preflight observations

- Docker Desktop 4.98.0 is installed per-user and runs with the WSL 2 backend. Docker client and engine 29.9.2 respond successfully.
- PostgreSQL 17 runs healthy in isolated Compose project `devmentor-pilot-local`, backed by its own Docker volume and published at `localhost:5433`.
- `.env.local` is configured with `DATABASE_PORT=5433`; migrations completed through the latest version. Secret values are intentionally not recorded.
- The existing host `postgres.exe` listener on port `5432` was left running and untouched.
- The app has not been started. Stripe test credentials and a real email provider are not configured locally.
- Phase 6 has not started: no invitations, emails, bookings, payments, or refunds were created.
- D25 remains unrecorded, so decline and expiry refunds must be approved manually by the operator during rehearsal.

## Required before rehearsal

- Start the local app at `http://localhost:3000` after configuring the remaining settings privately in `.env.local`.
- Configure the remaining local settings privately in `.env.local`: `APP_BASE_URL`, real HTTP mail provider settings, and Stripe **test** secret and webhook keys. Keep `PAYMENTS_LIVE_ENABLED=false` and leave `REFUND_AUTO_APPROVE_REASONS` empty while D25 is outstanding. Do not record secret values here.
- Complete the operator bootstrap: invite founder A first, have them sign in, add their user id to `OPERATOR_USER_IDS`, then invite the rehearsal participants.
- Provide the test participant names and email addresses for one seeker and one mentor. These addresses will receive sign-in links from the configured mail provider.
- Ensure there is a safe way to block the payment webhook for one test checkout and then restore it for the remaining rehearsal.

## Rehearsal checklist

| Check | Result | Evidence / notes |
|---|---|---|
| Invite founder A; sign in; configure operator id | Not run | Waiting for target environment and recipient details |
| Invite seeker and mentor; sign both in by email link | Not run | Waiting for target environment and recipient details |
| Mentor activity label is visible to the seeker | Not run | |
| Create a booking and complete a Stripe test payment | Not run | |
| Block one webhook; verify `reconcile-payment` records the paid booking | Not run | |
| Accept a booking; verify an overlapping booking is rejected | Not run | |
| Decline a booking; approve the refund as operator (D25 is outstanding) | Not run | |
| Open an operator-initiated refund and approve it | Not run | |
| Leave a booking unanswered; verify expiry and operator-approved refund | Not run | |
| Verify the mentor no longer sees the question after decline/expiry | Not run | |
| Verify text session posting and the 25-minute read-only boundary | Not run | |

## Decision

Not made. Founder A must review the completed evidence and separately confirm D25, E03-T02, E03-S01, and whether the pilot may go live. No live payment key or live-payment flag was enabled.
