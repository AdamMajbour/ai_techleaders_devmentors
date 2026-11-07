# Mentor onboarding prototype

## Context

- Brief: `.ai/specs/product-brief.md`
- Selected flow: mentor onboarding
- Revision date: 2026-10-31
- Previous revision: none
- Panel report: none supplied; this was a direct invocation.
- User-approved simulation boundary: invited mentor; invitation to profile, 25-minute text-session offer, sample availability, review, and a simulated ready state. Profile + session only; no vault-note flow.
- Starting point: a fictitious mentor opens an invitation to the private pilot.
- Intended outcome: a fictitious profile is shown as ready for the invited-participant list in the simulation. No actual profile, listing, booking, payment, account, or persisted data is created.

## Preserved scope, rules, and decisions

All listed business rules and decisions remain as written in the brief; this artifact is a local simulation, not a change to them.

| Reference | Source and owner | Status / use in this simulation |
|---|---|---|
| R01 | `.ai/specs/product-brief.md` → Business rules; workshop source `2026-08-26-workshop-export.md`; founder A | Active. Uses the 25-minute session duration; 50 minutes is not included. |
| R03 | `.ai/specs/product-brief.md` → Business rules; interview source `2026-09-03-interview-staff-engineer-declined-before.md`; founder A | Active. No published note is created in this flow. |
| R04 | `.ai/specs/product-brief.md` → Business rules; interview source `2026-09-02-interview-freelancer-react.md`; founder A | Active. The pilot price is shown before any simulated seeker input; there is no checkout or payment here. |
| R05 | `.ai/specs/product-brief.md` → Business rules; interview source `2026-09-03-interview-senior-python-meetups.md`; founder A | Active. No seeker question or mentor acceptance is simulated. |
| N01 | `.ai/specs/product-brief.md`; decision source `.ai/specs/decisions/N01-no-video.md`; founder A | Active. Text sessions only; no video destination or call. |
| N02 | `.ai/specs/product-brief.md`; decision source `.ai/specs/decisions/N02-no-ratings.md`; founder A | Active. No ratings or reviews; the profile uses a public-work link. |
| D04 | `.ai/specs/product-brief.md`; decision source `.ai/specs/decisions/D04-finding-a-mentor-list-and-links.md`; founder A | Active. Technology-filtered list plus mentor links; the prototype shows a technology and public-work link. |
| D16 | `.ai/specs/product-brief.md`; decision source `.ai/specs/decisions/D16-pilot-prices-and-payer.md`; founder A | Active. Shows the pilot's €25 price for a 25-minute session. |
| D19 | `.ai/specs/product-brief.md`; decision source `.ai/specs/decisions/D19-pilot-list-visibility.md`; founder A | Active. The simulated ready state is visible only to invited pilot participants. |
| D18 | `.ai/specs/product-brief.md`; decision source `.ai/specs/decisions/D18-pilot-end-date.md`; founder A | Active. Pilot end date is 2026-12-14; no date-dependent behavior is simulated. |

The vault answer, AI use of mentor notes, mentor previews, and earnings (D01, D06, D09–D11, D14) are excluded from this approved flow. The 50-minute price remains open (Q05); public-list conditions remain open (Q09); legal review of pilot terms remains a gate before the first real payment (Q07/D22). This artifact does not represent legal terms or resolve any of these questions.

## Assumptions

- `[ASSUMPTION] A-P1 — Profile fields and technology examples`: the brief establishes technology filtering and a public-work link, but not the exact profile schema or technology taxonomy. The simulation asks for a display name, one primary technology, and a text link, with TypeScript, React, and PostgreSQL as illustrative options. Check these fields and options with the product owner before implementation.
- `[ASSUMPTION] A-P2 — Sample availability`: the brief does not specify scheduling or timezone rules. The user approved fictitious weekday/time sample slots; they are illustrative, not actual availability or a booking promise. Confirm scheduling semantics before implementation.
- `[ASSUMPTION] A-P3 — Invitation entry`: the brief says the pilot is for invited participants (D19), but does not define invitation or account setup. The entry screen represents an invitation without authentication, personal data, or legal acceptance.

No panel report was supplied, so there are no `[SYNTHETIC]` suggestions to record. The brief reports no synthetic walkthroughs in its Hypotheses to test section.

## Screen and state map

| Screen / state | Action | Expected next state | Rules / assumptions |
|---|---|---|---|
| `#welcome` — invitation | Start setup | `#profile` | D19; A-P3 |
| `#profile` — profile fields | Continue with missing values | Stay on profile; show field and form errors | A-P1 |
| `#profile` — valid profile | Continue | `#availability` | D04, D16, N02; A-P1 |
| `#availability` — no slot selected | Review profile | Stay on availability; show recovery message | A-P2 |
| `#availability` — one or more sample slots | Review profile | `#review` with simulated profile and slots | R01, D16; A-P2 |
| `#review` | Edit or go back | Previous profile/availability screen | A-P1, A-P2 |
| `#review` | Finish simulated setup | `#complete` | D19; no real listing |
| `#complete` | Back or reset | Review, or cleared `#welcome` | In-memory state only |
| Unknown fragment | Return to invitation | `#welcome` | Recovery |

### Reproducible checks and evidence

1. Open `index.html` directly in a browser; no server or network is needed.
2. Select **Start setup**; check the profile screen and its heading.
3. Submit the profile empty; verify errors. Enter fictitious values and continue.
4. Continue without a slot; verify the recovery message. Select one or more sample slots and continue.
5. Review the displayed profile, edit/back, then finish; verify the simulated ready state and invited-only visibility.
6. Use **Reset simulation**; verify the start screen returns and profile, slots, errors, and completion text are cleared.
7. Open an unknown fragment and return to the invitation. Exercise browser back/forward, keyboard traversal, visible focus, heading focus after navigation, and a narrow viewport.

#### Browser walk (2026-10-31)

Configured provider: `agent-browser` 0.35.2. `doctor --json` passed. The version-matched `skills get core` guidance directory was unavailable, so the documented provider operations and CLI help were used. Both isolated browser sessions were closed successfully.

| Action | Expected | Observed | Evidence |
|---|---|---|---|
| Open the local `file://` artifact | Invitation and start action | Invitation heading and link visible | `evidence/01-invitation.png` |
| Start setup; submit the empty profile | Profile screen; accessible validation and correction path | Profile remained open; field errors displayed, name received focus, form error text matched | `evidence/02-profile-validation.png` |
| Correct the profile with fictitious values; continue | Availability screen | Name, technology and non-routable example link retained; TypeScript selected | `evidence/03-availability-error.png` (availability before empty-slot submit) |
| Try review with no sample slot selected | Stay on availability and show a useful recovery message | Exact validation text displayed; snapshot remained on availability | `evidence/11-availability-validation.png` |
| Select a sample slot; review the profile | Show the selected slot and submitted profile data | Name, technology, link and slot matched the inputs | `evidence/04-availability-selected.png`, `evidence/05-review.png` |
| Finish simulated setup | Show the ready state, invited-only visibility and no-real-profile notice | Completion heading and summary matched; status notice was present | `evidence/06-complete.png` |
| Use in-artifact back/edit | Return to review/profile while retaining fictitious values and selected slot | Review, profile edit and availability states were reachable; values persisted | `evidence/08-review-narrow.png` |
| Browser back then forward across fragments | Restore prior complete/review screens | URL and accessible snapshot showed `#complete`, then `#review` | Browser snapshots; no separate screenshot |
| Tab through review controls | Keyboard reaches actionable links with a visible focus indicator | Focus moved from heading to Back then Edit profile; focused link outline style was solid | `evidence/07-keyboard-focus.png` |
| Set viewport to 390 × 844 | Layout remains usable without horizontal overflow | Reset and journey controls remained available; `scrollWidth` and `innerWidth` were both 390 | `evidence/08-review-narrow.png` |
| Reset after completion | Return to invitation and clear simulated state | `#welcome`, welcome heading focused, name and completion summary empty, slot unchecked | `evidence/09-reset-start.png` |
| Open an unknown fragment; return to invitation | Explain recovery and provide a working destination | Recovery heading appeared; return link navigated to `#welcome` | `evidence/10-unknown-fragment.png` |

#### Static and browser verification

Static review passed on 2026-10-31: the inline script passes Node syntax checking; there are no external resources, network APIs, persistent-storage references, or form actions; all seven fragment links resolve; IDs are unique; and explicit label targets exist. The browser walk exercised the full approved journey, both validation paths, correction, profile review/edit, completion, in-artifact and browser back/forward navigation, unknown-fragment recovery, reset, keyboard focus, heading focus after navigation, and the 390 × 844 viewport. Screenshots are actual captures from the local prototype. Browser and static checks passed; `prototype.json` records verification as `passed`.

## Limitations and use

This prototype tests only the sequence and labels of the approved onboarding simulation. It uses fictitious data, has no external links or network operations, and stores all state in page memory. It does not demonstrate demand, verify the assumptions above, satisfy the Definition of Ready, or establish production readiness.

Open `index.html` locally. Use **Reset simulation** to clear the in-memory state and return to the invitation.
