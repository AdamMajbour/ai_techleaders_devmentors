# Personas — DevMentor (wybór sesji z mentorem)

Basis: `devmentor-synthetic-input/.ai/specs/product-brief.md` (Product, Target group, Problems, Key flows, Business rules, Non-goals, Scope, Glossary) · research: `2026-08-20-interview-working-dev.md`, `2026-09-02-interview-platform-dev-solves-alone.md`, `decisions/D07, D09, D21, D22, D27, N01` · holdout `holdout/2026-09-01-interview-backend-dev-fintech.md` NOT opened for persona building · Built 2026-10-25, audited against the notes 2026-10-25 · Stance default: adversary (brief Mode: own)
Panel composition: assumed — the material gives no segment proportions (brief, Target group); one persona per segment, because each segment has exactly one note. One of the two seats is the indifferent one (platform-dev note).
Coverage: 29 persona lines — 26 sourced, 3 assumed (P01: 12 sourced / 2 assumed; P02: 14 sourced / 1 assumed); no persona is an assumption persona. Scenario assumptions are listed separately below and are not persona lines.

Source keys: `working-dev` = `2026-08-20-interview-working-dev.md`; `platform-dev` = `2026-09-02-interview-platform-dev-solves-alone.md`. Tags and keys are stripped before a block goes to its subagent.

Audit rule used: a line stays only when the persona's own words or the note's facts show it. The interviewer's remarks about how the conversation went (hurry, watching the clock) describe the interview, not the person, and are not persona lines. A line with no source is not kept as a line; it goes under *No basis for*.

## P01 — developer blocked the day before a release, no senior available

Runs: 1
- Segment and share of the panel: one of two seats; the share is assumed, no proportions in the material. `[ASSUMPTION]` brief, Target group ("Brak danych o proporcjach")
- Situation the problem shows up in: at a mid-size product company, stuck on a TypeScript generics error the day before a release; the team's only senior is on leave. `[INTERVIEW]` working-dev
- What they did last time: 40 minutes on Stack Overflow, asked in a Discord, got two contradictory answers, shipped a workaround with a TODO (the note's wording, not necessarily theirs). `[INTERVIEW]` working-dev
- State of mind at entry — rushed and anxious: an inference from "the day before a release, senior on leave", not a statement in the note. `[INTERVIEW]` working-dev (derived)
- How much this topic matters to them: central in this situation ("half a day, and I still don't trust that code"). `[INTERVIEW]` working-dev
- Goal, in their words: "I don't want a course, I want an answer." `[INTERVIEW]` working-dev
- Success, as they would recognise it: "someone who has actually done this looks at my code and tells me what to do, within the hour." (what "within the hour" means is unclear) `[INTERVIEW]` working-dev
- Constraints — time: the release the day after. `[INTERVIEW]` working-dev
- Tools they already use for this: Stack Overflow, a Discord; a paid course last year ("generic, and outdated by the time I finished"). `[INTERVIEW]` working-dev
- Words they use: "answer", "speed", "subscription", "course" (as something they do not want); quoted in the note. `[INTERVIEW]` working-dev
- Objections they will raise: generic or outdated material (the course). `[INTERVIEW]` working-dev
- Preference stated: "I'd pay for speed, not for a subscription." (a preference about what to pay for, not a refusal) `[INTERVIEW]` working-dev
- Did not care about: video calls ("text is fine, faster"). `[INTERVIEW]` working-dev
- The reason this person would not switch: help that arrives after the time they need it; inferred from the stated success condition, the threshold is not in the material. `[ASSUMPTION]` inference from working-dev
- No basis for: who pays and how much is acceptable; who decides; switching cost; what "within the hour" means in hours; how they judge a stranger's competence; sign-in habits (GitHub or e-mail); how often urgent problems recur; whether they have a refusal that the note does not show. Real check: a follow-up interview with a developer who last shipped under an urgent blocker.
- Removed in audit: the word "workaround" from *Words they use* (it is the note's summary wording, not a quote); "will not buy a subscription" as a refusal (the quote shows a preference, not a refusal); the unsourced budget/payer/decider/switching-cost line (moved to No basis).

## P02 — platform developer in a large company with an internal channel, the topic barely matters

Runs: 1
- Segment and share of the panel: second seat; the share is assumed. `[ASSUMPTION]` brief, Target group
- Situation the problem shows up in: a coding-agent configuration stopped applying lint rules; solved alone in half a day; nothing was shipping that day. `[INTERVIEW]` platform-dev
- State of mind at entry — indifferent, because nothing was burning and they are the person colleagues ask: "nic się nie paliło", "kogo. to mnie pytają". `[INTERVIEW]` platform-dev
- How much this topic matters to them: barely ("nie potrzebuję platformy do tego. raz w roku może"). `[INTERVIEW]` platform-dev
- Goal: no problem carried (interviewer's summary: "not a problem they carry"); "doszedłbym sam. doszedłem". `[INTERVIEW]` platform-dev
- Conditions under which they would pay a person: a task done once only and costing a day, a helper found in five minutes, finished within an hour, paid by the company. `[INTERVIEW]` platform-dev
- Constraints — who pays: the company; "nie płacę za rzeczy do pracy sam". `[INTERVIEW]` platform-dev
- Constraints — who else can help: an internal channel in a company of two hundred people, "zawsze ktoś jest". `[INTERVIEW]` platform-dev
- Tools they already use for this: the internal channel (what they would write to); conferences and books are what they have paid for; has never paid a person for help. `[INTERVIEW]` platform-dev
- How they judge a helper: "zobaczyłbym, co zrobił. albo ktoś, kogo znam, by powiedział." `[INTERVIEW]` platform-dev
- Words they use: "platforma", "subskrypcja", "na firmę", "migracja", "wewnętrzny". `[INTERVIEW]` platform-dev
- Objections they will raise: a subscription ("jak to subskrypcja, to nie otworzę drugi raz"). `[INTERVIEW]` platform-dev
- What they will not do, whatever the product offers: pay for work things out of their own pocket. `[INTERVIEW]` platform-dev
- Did not care about: saved conversations, a platform, most of the offer. `[INTERVIEW]` platform-dev
- The reason this person would not switch: the internal channel and solving alone cover the need. `[INTERVIEW]` platform-dev
- No basis for: reaction to a concrete price; what the company's approval process for an expense looks like; how they use GitHub sign-in; reaction to a mentor list; whether they would use the product at all, since the question was not asked. Real check: an interview with a developer in a large company about their last expensed external help.
- Removed in audit: "Traits: terse, watches the time" (interviewer's observation of a 15-minute coffee conversation, a feature of the meeting, not of the person); "brisk" from the state of mind (same origin); "any helper that takes more than five minutes to find" as an objection (it is a condition for paying, now under *Conditions*).

## Scenario assumptions (not persona lines, not evidence)

Added by the interviewer to make the scenarios and the walk runnable. They are not in the notes; they were given to the subagents as part of the setup, and any finding that depends on one must say so. Tag: `[SCENARIO]`.

| # | Assumption | Applies to | Used in |
|---|---|---|---|
| SC1 | The place they ask today (Stack Overflow, the Discord) is open in another tab and needs no sign-in. | P01 | S1 |
| SC2 | The internal channel is already open in another tab and needs nothing. | P02 | S1 |
| SC3 | A trusted colleague sends a link to one mentor's profile. | P01, P02 | S2 variant |
| SC4 | The mentor list shows no score and no search; the person is not told how to tell a good mentor from a bad one (this restates D21, but the scenario card stressed it, which may have steered the answer). | P01, P02 | S2 |
| SC5 | The person has "a few minutes" to choose. | P01, P02 | S2 |
| SC6 | The price value is unknown at the decision (the material gives none); employer pays as a hypothetical switch of the payer. | P01, P02 | S3 |
| SC7 | The earliest slot is (a) later today or (b) after the need has passed; values are qualitative, not in the material. | P01, P02 | S4 |
| SC8 | The problem sits in code in their own editor and repository; for P02 this is the lint-rules configuration. | P01, P02 | S5 |
| SC9 | The person is in the same kind of situation as in the note when looking at the service (urgent for P01; nothing burning for P02). | P01, P02 | Part B |
| SC10 | Interview language: English for P01 (note in English, quotes in English), Polish for P02 (conversation in Polish). | P01, P02 | Parts A–D |
| SC11 | The persona was told to answer "no basis" where the persona block is silent, and to add one "why I would still not switch" line per answer (adversary frame). | P01, P02 | Part A |
| SC12 | The persona walks the five steps on paper using only the brief's step text. | P01, P02 | Part C |
