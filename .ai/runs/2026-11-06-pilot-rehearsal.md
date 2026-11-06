# Pilot rehearsal — 2026-11-06

Status: **Preflight incomplete; rehearsal not started.**

Scope: run the E01 go-live rehearsal in the target environment with Stripe test credentials and a real mail provider. Live payment mode must remain disabled.

## Preflight observations

- `.env.local` is absent in the current workspace.
- The process environment has no configured target URL, Stripe test credentials, mail provider, database connection, or operator bootstrap value.
- No application is listening on `localhost:3000`.
- No invite, email, booking, payment, or refund was created during this preflight.
- D25 remains unrecorded, so decline and expiry refunds must be approved manually by the operator during rehearsal.

## Required before rehearsal

- Identify the target environment URL and confirm that it runs the commits for Phases 1–5.
- Configure secrets privately in that environment: `JWT_SECRET`, database connection, `APP_BASE_URL`, real HTTP mail provider settings, and Stripe **test** secret and webhook keys. Keep `PAYMENTS_LIVE_ENABLED=false` and leave `REFUND_AUTO_APPROVE_REASONS` empty while D25 is outstanding.
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
