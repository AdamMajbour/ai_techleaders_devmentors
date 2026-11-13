# Walkthrough: mentor onboarding, `.ai/prototypes/discovery/mentor-onboarding/revision-001/index.html`, 2026-10-31

The repeated `[SYNTHETIC]` question is whether the invitation should clarify how its profile/session setup relates to mentors' private notes and consent. Both interview-grounded instances raised this before submitting a profile, but they share one short interview source. Ask invited mentors with private notes to paraphrase the invitation and walk through the profile step. This is a question, not a barrier or a usability verdict.

Stance: validate
Panel: 2 runs × 2 personas; run 1 P05/P06, run 2 P07/P08
Basis: `.ai/specs/product-brief.md` (mentor target, A04, R02); `.ai/specs/research/2026-08-22-interview-mentor.md` [INTERVIEW]; `.ai/specs/research/2026-09-04-mentor-list-note.md` [DATA]; prototype README [DOCUMENT] and observed HTML [PRODUCT].
Panel snapshot: [personas.md](./personas.md)
Session: `.ai/specs/research/walkthroughs/2026-10-31-mentor-onboarding-session-002/`; exact subject `.ai/prototypes/discovery/mentor-onboarding/revision-001/index.html`; flow `mentor onboarding`.
Composition: assumed 1:1 split because the material gives no population proportions. Each run includes one mentor grounded in the same August interview and one invite-list assumption persona in the barely-interested seat.
Saturation: reached within this narrow panel; no new grounded topic appeared in the last three interviews. This is source exhaustion, not real-mentor saturation.
Parity: skipped; the August mentor interview built the grounded persona. The two September 3 mentor notes were exposed in session 001 and are not eligible as held-out notes here. No overlap number is recorded.
Elapsed: phase timing not recorded.
Not askable of this panel: seeker assumptions A01-A03, channel assumption A05, and population-level invite completion/conversion. No seeker persona was sampled.

## 🎯 Scope and limits

Static local HTML prototype, not a running product. Each persona began at the invitation in an isolated `agent-browser` session. P05 stopped at the invitation; P06, an assumption persona, walked through the entire simulation with only fictitious inputs and a sample slot; P07 stopped at profile validation; P08 stopped at the invitation under an assumed low-salience state. The browser was not used for a real account, profile, booking, payment, or external action. No credentials or personal data were entered. The prototype explicitly states that its data exists only in the page until reset or close.

Provider: `agent-browser` v0.35.2; its version-matched interaction guide was unavailable, so the provider's documented operations were used. This named-flow walkthrough did not assess narrow viewports, keyboard/focus traversal, unknown fragments, browser history, or reset behavior.

## 🔍 Barriers that repeated

No repeated barrier to task completion was established. P05 stopped at the invitation over uncertainty about consent; P07 started but stopped at the required profile fields; P06 continued with fictitious data, while P08 deferred under an assumed low-salience state. The full flow was completed only by an assumption persona, so that path does not establish that real mentors would complete it or that the flow is barrier-free.

## 📋 Missing cases that repeated

### Invitation does not explain where private notes and consent fit in the profile/session setup

[SYNTHETIC]

Weight: 2 observations across 2 runs; spread: ±0; personas: P05 (run 1), P07 (run 2). Both are fresh synthetic instances grounded in the same single interview, not independent real-user replication. Touches A04 and prototype assumption A-P3; it does not establish a contradiction with R02.

At the invitation, P05 was careful about sharing and could not see how the flow handled consent for mentee material. P07 read the screen as profile plus a paid session offer and could not tell how that connected to the mentor's notes. Both raised the question before profile submission. The prototype's declared scope excludes the vault-note flow, so this is not evidence that the onboarding should add a notes feature; it is a hypothesis that the boundary may need clearer explanation.

**Real check:** recruit invited mentors who currently answer recurring questions with private notes. Show the invitation, ask them to explain what they think the setup creates and what they expect will happen to their notes, then observe a think-aloud attempt through the profile step. Ask for a recent example of deciding whether to share a mentee-related answer. This would test the invitation boundary and inform A04/A-P3 without presuming a feature.

## ⚠️ Contradictions with the brief

None established. The observed screens distinguish the prototype simulation from real publication, availability, booking, or payment. No conflict with R02, N01, or N02 was observed.

## 🔍 Outliers

P05 (run 1) stopped at the invitation even in the neutral screen-walk state, citing care about what is shared; the interview source supports the consent concern but not a prior invitation response. P07 (run 2) stopped after seeing required profile fields, especially the public-work link; this did not repeat as a stop in the other run. P08 (run 2) deferred at the invitation because low interest was explicitly assumed. These are synthetic scenario outcomes, not reports about actual invitees.

## 🔁 Seen once, not reported as a finding

- P07 (run 2) did not proceed from profile validation because all three fields were required and no inspect-without-input path was visible. P06 (run 1) continued using fictitious values, so this did not repeat as a barrier.
- P06 (run 1) observed that Review profile without a selected slot returned “Choose at least one sample slot to review this simulated profile,” then selected a sample and reached review/completion. This was an assumption persona and appeared in only one run.
- P05 and P08 stopped at the invitation for different reasons. Only P05's note/consent boundary question recurred with P07.

## 🧪 To confirm with real users

| # | Hypothesis | Persona ids / runs | Settles | Who to recruit | How |
|---|---|---|---|---|---|
| 1 | [SYNTHETIC] The invitation leaves unclear how this profile/session setup relates to the mentor's private notes and consent boundaries. | P05/run 1, P07/run 2; same source interview | A04 and prototype assumption A-P3 | Invited mentors who answer recurring questions with private notes | Show the invitation; ask the mentor to explain what the setup creates and what they expect will happen to their notes; observe a think-aloud attempt through the profile step; ask for a recent example of deciding whether to share a mentee-related answer. |

## 📝 Interviews

The interviews used five general past-tense questions, probes for A04 and the prototype's profile, availability, and invitation setup, four balanced past-behavior checks, and one interruption pressure per simulated decision. No stated-preference question was asked. Source-grounded responses appear in [run 1 P05](./transcripts/run-1-P05.md) and [run 2 P07](./transcripts/run-2-P07.md); no-individual-basis interviews appear in [run 1 P06](./transcripts/run-1-P06.md) and [run 2 P08](./transcripts/run-2-P08.md).

Acquiescence measure: 4 yes among 8 answered checks across P05/P07 (2/4 each); P06/P08 had 8 no-basis answers. The answered yes share is exactly half, not above half. This small, source-dependent panel is not a population estimate.

## ✅ Quality-gate notes

Persona lines are tagged and sourced or explicitly assumed; no demographics or unsupported trait profiles were added. No stated-preference question was used. The single missing-case hypothesis appeared in both runs and is paired with a real-user task; no single-run observation is presented as a finding. No persona-derived share or prediction is reported. The panel is source-limited: P05/P07 share one interview, and P06/P08 are assumption personas. No one common modern tool was proposed; geography and employer diversity cannot be assessed from these materials; engagement differs by design. The screen walk was incomplete for three personas, so a zero-barrier conclusion is not warranted. Parity was skipped without a score; the reason is recorded in [calibration.md](../../calibration.md). No brief, spec, or tracker item was edited.

## 📸 Evidence

Captured observed states: [P05 invitation](./screenshots/run-1-P05-step-01-invitation.png); [P06 invitation](./screenshots/run-1-P06-step-01-invitation.png), [profile](./screenshots/run-1-P06-step-02-profile.png), [profile validation](./screenshots/run-1-P06-step-03-profile-validation.png), [fictitious profile](./screenshots/run-1-P06-step-04-profile-filled.png), [availability](./screenshots/run-1-P06-step-05-availability.png), [availability validation](./screenshots/run-1-P06-step-06-availability-validation.png), [sample selected](./screenshots/run-1-P06-step-07-availability-selected.png), [review](./screenshots/run-1-P06-step-08-review.png), [completion](./screenshots/run-1-P06-step-09-complete.png); [P07 invitation](./screenshots/run-2-P07-step-01-invitation.png), [profile](./screenshots/run-2-P07-step-02-profile.png), [profile validation](./screenshots/run-2-P07-step-03-profile-validation.png); [P08 invitation](./screenshots/run-2-P08-step-01-invitation.png).

Personas: `.ai/specs/research/personas.md`
Walkthrough: `.ai/specs/research/walkthroughs/2026-10-31-mentor-onboarding-session-002/report.md`
Runs: 2 runs × 2 personas; 1 finding survived every run; saturation reached
Parity: skipped: no eligible held-out mentor interview; the August interview built the grounded persona and September 3 notes were exposed in session 001
Hypotheses: 1 to confirm with real users
Next: om-discover --refresh
