# D27 — Mentor-set session prices within operator-managed bounds

- Date, owner: 2026-11-16, founder A (Oliwia); approval confirmed by the requester on this date.
- Supersedes: the session-price portion of D16 only. D16's vault-answer price remains active.
- Context and options weighed: D16 set one session price for all mentors (25 EUR for 25 minutes) and left the 50-minute price unset. The platform-settings proposal adds mentor-specific prices while allowing operators to configure acceptable ranges. Existing application prices are 2500/5000 grosz.
- Decision: the seeker pays the mentor's selected price for a 25- or 50-minute session. The mentor sets each amount in PLN within operator-managed inclusive minimum/maximum bounds. Initial bounds are min=max=2500 grosz for 25 minutes and min=max=5000 grosz for 50 minutes, preserving current charges until the operator widens them. The 10 EUR vault-answer price is unchanged. The platform charges no additional commission or fee.
- Consequences: the operator bounds and mentor-specific prices may be implemented according to `.ai/specs/2026-11-15-platform-settings.md`. Booking must display the current price before the question, reject stale quotes, and snapshot the server-calculated price. Existing bookings retain their agreed amount. This decision is a product choice, not evidence that mentors' rates or seeker willingness to pay have been validated.
- Revisit: founder A may supersede this decision if pilot evidence or mentor feedback warrants a pricing change. Market validation remains open.
- Status: active.
