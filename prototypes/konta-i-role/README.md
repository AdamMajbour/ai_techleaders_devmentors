# Accounts and roles prototype

This is a review prototype for screen-map screens `s01` and `s04`–`s08`. It is not production authentication and does not change the app or design system. Screen IDs `s02` and `s03` remain out of scope.

## Run and build

The preview sandbox serves `packages/ui/.storybook/public` on port 3000:

```powershell
npm exec --workspace @devmentor/ui -- storybook dev -p 3000 --no-open --no-version-updates --disable-telemetry
```

In another terminal, build the ignored preview output:

```powershell
npm exec -- vite build --config prototypes\konta-i-role\vite.config.ts
```

Open `http://localhost:3000/prototypes/konta-i-role/index.html`.

Run the screen-navigation browser tests with the existing Playwright installation and a local Chromium browser:

```powershell
npm exec -- playwright test --config prototypes\konta-i-role\playwright.config.ts
```

## Demo accounts

All identities and addresses below are fictional; no password is used.

| Account | Demo address | Role |
|---|---|---|
| Maja Demo | `maja.mentee@demo.test` | seeker |
| Ada Kowalska | `ada.mentor@demo.test` | mentor |
| Ola Operator | `ola.operator@demo.test` | operator |
| Alex Demo | `alex.dual@demo.test` | seeker + mentor |

Use the **Scenario controls · review only** bar to select an account, session, email response, email validity, link result, or page-data state. These controls are separate from product navigation.

## Scenarios

- Sign-in: valid or invalid demo email; invited and uninvited addresses show the same response; simulated rate limit and send failure.
- Link verification: valid, expired, already used, or verification error. A valid link redirects to the selected account's allowed home; retrying a verification error simulates a valid link.
- Access: signed-out and expired sessions are sent to sign-in; a successful sign-in returns to an allowed requested screen. A signed-in account without the required role sees `s08`.
- Role pages: loaded, loading, empty, and load-error states; **Try again** clears the simulated error. The prototype intentionally has no source-backed mentors, bookings, or approvals.
- Review controls: screen chooser, comments, hotspots, presentation, threads, pins, Back, sign-in layout variants, and light/dark theme.
- On the `s08` access gate, the review-engine Back control is intentionally disabled to prevent returning to the denied route. Use the displayed sign-in or own-home link; if you switch to an account that can access the requested screen, the gate offers a direct continuation link.

## Simulation limits and unresolved questions

- Email delivery, account creation, link tokens, sessions, and authorization are local simulations. No network request, password, real token, payment, or personal account data is used.
- Page states contain no fabricated mentor profiles, bookings, approval records, user totals, ratings, reviews, or dates. The demo clock is fixed at `2026-11-03T13:00:00Z`.
- The dedicated accounts-and-roles specification is absent. The nearest available source is `.ai/specs/2026-10-26-pilot-booking-flow.md`; it does not specify every role landing page.
- `s07` access is unsettled: the pilot-flow spec says operator access is a separate allowlist, while `AGENTS.md` says there is no RBAC. The demo role does not resolve that product/architecture conflict.
- The screen map's 15-minute link lifetime and some return behavior are assumptions for the prototype, not confirmed production policy. Per-screen notes identify related stories, simulated behavior, and unresolved decisions.
- Sign-in layouts A/B/C are visual alternatives for review, not a product choice. The prototype does not determine the final layout, real page content, or missing screen stories.

## Design-system gaps

- Existing UI primitives and semantic tokens are used for the rendered screens.
- No shared composition exists for the operator approvals page (`s07`) or access-denied page (`s08`); these prototype views compose existing components locally.
- Existing login examples do not fully align with the screen map's `Card` composition. This prototype does not change `packages/ui`.

## Verification record

Stage 3 browser and navigation checks, dimensions, themes, keyboard behavior, and any remaining limits are recorded in `POSTEP.md`.
