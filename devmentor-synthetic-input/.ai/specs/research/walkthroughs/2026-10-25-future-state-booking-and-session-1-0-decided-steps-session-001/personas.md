<!-- Session snapshot, run 1 (panel P01, P02) -->
# Personas — DevMentor (wybór sesji z mentorem)

Basis: `devmentor-synthetic-input/.ai/specs/product-brief.md` (Product, Target group, Problems, Key flows, Business rules, Non-goals, Scope, Glossary) · research: `2026-08-20-interview-working-dev.md`, `2026-09-02-interview-platform-dev-solves-alone.md`, `decisions/D07, D09, D21, D22, D27, N01` · holdout `holdout/2026-09-01-interview-backend-dev-fintech.md` NOT opened for persona building · Built 2026-10-25 · Stance default: adversary (brief Mode: own)
Panel composition: assumed — the material gives no segment proportions (brief, Target group); one persona per segment, because each segment has exactly one note. One of the two seats is the indifferent one (platform-dev note).
Coverage: 31 persona lines — 27 sourced, 4 assumed (P01: 12 sourced / 3 assumed; P02: 15 sourced / 1 assumed); no persona is an assumption persona

Source keys: `working-dev` = `2026-08-20-interview-working-dev.md`; `platform-dev` = `2026-09-02-interview-platform-dev-solves-alone.md`. Tags and keys are stripped before a block goes to its subagent.

## P01 — developer blocked the day before a release, no senior available

Runs: 1
- Segment and share of the panel: one of two seats; the share is assumed, no proportions in the material. `[ASSUMPTION]` brief, Target group ("Brak danych o proporcjach")
- Situation the problem shows up in: stuck on a TypeScript generics error the day before a release; the team's only senior is on leave. `[INTERVIEW]` working-dev
- What they did last time: 40 minutes on Stack Overflow, asked in a Discord, got two contradictory answers, shipped a workaround with a TODO. `[INTERVIEW]` working-dev
- State of mind at entry — rushed and anxious, because the release is the next day and no one nearby can help: derived from the situation. `[INTERVIEW]` working-dev
- How much this topic matters to them: central in this situation ("half a day, and I still don't trust that code"). `[INTERVIEW]` working-dev
- Goal, in their words: "I don't want a course, I want an answer." `[INTERVIEW]` working-dev
- Success, as they would recognise it: "someone who has actually done this looks at my code and tells me what to do, within the hour." (what "within the hour" means is unclear) `[INTERVIEW]` working-dev
- Constraints — time: release the next day. `[INTERVIEW]` working-dev
- Constraints — budget, who pays, who decides, switching cost: no source. `[ASSUMPTION]` listed under No basis for
- Tools they already use for this: Stack Overflow, a Discord; a paid course last year ("generic, and outdated by the time I finished"). `[INTERVIEW]` working-dev
- Words they use: "answer", "speed", "workaround", "subscription", "course" (as something they do not want). `[INTERVIEW]` working-dev
- Objections they will raise: generic or outdated material; paying a subscription rather than for speed. `[INTERVIEW]` working-dev
- What they will not do, whatever the product offers: buy a subscription ("I'd pay for speed, not for a subscription"). `[INTERVIEW]` working-dev
- Did not care about: video calls ("text is fine, faster"). `[INTERVIEW]` working-dev
- The reason this person would not switch: help that arrives after the time they need it; derived from the stated success condition, the exact threshold is not in the material. `[ASSUMPTION]` inference from working-dev
- No basis for: who pays and how much is acceptable; who decides; what "within the hour" means in hours; how they judge a stranger's competence; sign-in habits (GitHub or e-mail); how often urgent problems recur. Real check: a follow-up interview with a developer who last shipped under an urgent blocker.

## P02 — platform developer in a large company with an internal channel, the topic barely matters

Runs: 1
- Segment and share of the panel: second seat; the share is assumed. `[ASSUMPTION]` brief, Target group
- Situation the problem shows up in: a coding-agent configuration stopped applying lint rules; solved alone in half a day; nothing was shipping that day. `[INTERVIEW]` platform-dev
- State of mind at entry — indifferent and brisk, because nothing is burning and they are the person colleagues ask: "nic się nie paliło", "kogo. to mnie pytają". `[INTERVIEW]` platform-dev
- How much this topic matters to them: barely ("nie potrzebuję platformy do tego. raz w roku może"). `[INTERVIEW]` platform-dev
- Goal, in their words: none carried; "doszedłbym sam. doszedłem". `[INTERVIEW]` platform-dev
- Success, as they would recognise it: a task done once only and costing a day, a helper found in five minutes, finished within an hour, paid by the company. `[INTERVIEW]` platform-dev
- Constraints — who pays: the company; "nie płacę za rzeczy do pracy sam". `[INTERVIEW]` platform-dev
- Constraints — who else can help: an internal channel in a company of two hundred people, "zawsze ktoś jest". `[INTERVIEW]` platform-dev
- Tools they already use for this: the internal channel, conferences, books; has never paid a person for help. `[INTERVIEW]` platform-dev
- How they judge a helper: "zobaczyłbym, co zrobił. albo ktoś, kogo znam, by powiedział." `[INTERVIEW]` platform-dev
- Words they use: "platforma", "subskrypcja", "na firmę", "migracja", "wewnętrzny". `[INTERVIEW]` platform-dev
- Objections they will raise: a subscription ("jak to subskrypcja, to nie otworzę drugi raz"); any helper that takes more than five minutes to find. `[INTERVIEW]` platform-dev
- What they will not do, whatever the product offers: pay for work things out of their own pocket. `[INTERVIEW]` platform-dev
- Did not care about: saved conversations, a platform, most of the offer. `[INTERVIEW]` platform-dev
- Traits the material supports: terse, watches the time. `[INTERVIEW]` platform-dev
- The reason this person would not switch: the internal channel and solving alone cover the need. `[INTERVIEW]` platform-dev
- No basis for: reaction to a concrete price; what the company's approval process for an expense looks like; how they use GitHub sign-in; reaction to a mentor list. Real check: an interview with a developer in a large company about their last expensed external help.

---

## Audit note (2026-10-25, after the run) — this snapshot is kept as used; do not edit above

The persona blocks handed to the subagents differed from the corrected `../../personas.md` in these points:
- P01: "workaround" was listed among the words they use; the subscription line was phrased as an objection to subscriptions in general.
- P02: the state of mind was given as "obojętny, rzeczowy, nie masz czasu na długie rozmowy". "Rzeczowy" and "no time for long talks" come from the interviewer's remarks about the meeting, not from the person's words; they may have made P02's answers shorter and more dismissive than the material supports.
- P02: "objects to any helper that takes more than five minutes to find" was a condition for paying, not an objection.
- Both: the scenario assumptions SC1–SC12 in the corrected file were part of the setup.
Corrected lines: `devmentor-synthetic-input/.ai/specs/research/personas.md`.
