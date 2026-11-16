# Backlogs

## .ai/specs/product-brief.md
Backlog source: .ai/specs/product-brief.md
Last filed: 2026-10-25

| Id | Issue | Title | Epic | Depends on | Adopted |
|---|---|---|---|---|---|
| E01 | #7 | Seekers find a mentor and book a paid 25-minute text session (pilot) | — | — | no |
| E02 | #8 | Mentors publish notes and seekers buy a vault answer (pilot) | — | — | no |
| E03 | #9 | Pilot terms, payments and measurement before the first real payment | — | — | no |
| E01-T01 | #10 | Decide the account and login method for the pilot | #7 | — | no |
| E01-S01 | #11 | A seeker finds a mentor through an invited-only list or a mentor's link | #7 | #10 | no |
| E01-S02 | #12 | A seeker writes a question, sees the price first and prepays | #7 | #11 | no |
| E01-S03 | #13 | A mentor sees the question before accepting and a seeker is refunded on a no-show | #7 | #12 | no |
| E01-S04 | #14 | A seeker and a mentor hold a 25-minute text session in the product | #7 | #13 | no |
| E02-S01 | #15 | A mentor publishes notes and is told they feed AI answers | #8 | — | no |
| E02-S02 | #16 | A mentor sees every generated answer before it reaches a seeker | #8 | #15 | no |
| E02-S03 | #17 | A seeker buys a vault answer and the mentors of cited notes are credited | #8 | #16, #12 | no |
| E03-T01 | #18 | Write the pilot terms text for review | #9 | — | no |
| E03-T02 | #19 | The verifier reviews the pilot terms and payment handling before the first payment | #9 | #18 | no |
| E03-T03 | #20 | Delete session text and notes 30 days after 2026-12-14 | #9 | — | no |
| E03-S01 | #21 | A seeker accepts the pilot terms at payment | #9 | #19, #12 | no |
| E03-S02 | #22 | A mentor accepts the pilot terms and is paid out through Stripe | #9 | — | no |
| E03-S03 | #23 | A founder reads the pilot counts at the two reviews | #9 | #12, #17 | no |

Reserved, not filed: E04 (Later: mentor async answer within 24 hours, subscription for seekers, team plans, mentor pro, featured placement, session packs, AI note drafting and transcription; MCP undecided, Q04). Not doing: N01, N02.

## Acceptance criteria for E01 — paid text sessions

These criteria make the existing backlog testable. The linked specifications remain the source of detailed contracts and edge cases. `#10` is a technical enabler; its observable acceptance criterion is that the chosen sign-in flow creates a session usable by the later stories.

### E01-T01 / #10 — account and sign-in

- Given a valid invited account, when the user completes the configured sign-in flow, then the user receives an authenticated session with the invitation's seeker or mentor capability.
- Given an invalid, expired, revoked, or already consumed sign-in link, when it is submitted, then access is denied and no authenticated session is issued.
- Given an unauthenticated user, when they request a protected page or API resource, then the request is denied or redirected to sign-in without disclosing private data.

### E01-S01 / #11 — find a mentor

- Given an invited seeker, when they search the mentor list, then only published, eligible mentors are returned and technology filters narrow the results.
- Given a valid mentor link, when a seeker opens it, then the correct published mentor profile is shown; an unknown or unpublished mentor is not exposed as bookable.
- Given another user's private profile or booking data, when a seeker changes an identifier in a request, then the API does not return that data.

### E01-S02 / #12 — ask and prepay

- Given an eligible mentor and an allowed session duration, when a seeker starts booking, then the current server-calculated price is shown before payment and the question is validated.
- Given a valid booking and accepted required terms, when payment succeeds, then exactly one booking and payment record are created with the server-calculated amount and seeker ownership.
- Given a displayed mentor price, when the price revision changes before booking submission, then a stale quote returns `409`, persists no question/booking/payment/checkout, and asks the seeker to refresh and explicitly confirm; a legacy request with no quote revision returns `422`.
- Given payment confirms after the checkout cutoff or after the booking has become terminal, when a valid provider event arrives late or is retried, then the payment is compensated/refunded once, the booking is not reactivated, and a slot already claimed by another booking remains reserved.
- Given a client-supplied price, invalid duration, unavailable mentor, or failed payment, when booking is submitted, then the client amount is not trusted and no paid/confirmed booking is created.
- Given a duplicate payment notification or retry, when it is processed again, then the booking is not charged or created twice.

### E01-S03 / #13 — mentor decision and refund

- Given a paid pending booking, when its assigned mentor views it, then the mentor can see the seeker's question and accept or decline according to the booking state machine.
- Given a booking assigned to another mentor or owned by another seeker, when the user attempts a read or action, then access is denied and the record remains unchanged.
- Given a decline, no-show, or expired response window, when the refund rule applies, then the refund request follows the configured approval policy and is recorded idempotently.

### E01-S04 / #14 — text session

- Given an accepted booking, when either participant opens the session, then only the seeker and assigned mentor can read and send messages while the session is open.
- Given a closed, expired, or unrelated booking, when a participant attempts to send a message, then the API rejects it and preserves the conversation.
- Given a session note or content proposed for publication, when seeker approval is absent, then it remains private and unpublished.

### Backlog scope guard

The E01 stories cover invitation-based access, mentor discovery, prepayment, mentor decision/refund and private text sessions. Video calls and profile ratings/reviews remain excluded by N01/N02. The E01 acceptance criteria do not authorize live payments: E03-T02's independent verifier review remains a prerequisite for the first real payment.
