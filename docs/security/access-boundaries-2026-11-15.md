# Access-boundary evidence — 2026-11-15

**Application:** DevMentor web app/API + PostgreSQL  
**Base commit:** `b8bc5a98dd433f340975b9f29a1cf59d14749c63`  
**Target commit:** same repository revision; documentation-only audit updates are uncommitted  
**Tester:** Codex; accountable decision owner: project owner (not identified)  
**Environment:** `devmentor_qa` PostgreSQL database in `devmentor-qa-postgres` on `127.0.0.1:5434`, migrated and demo-seeded; isolated Next.js dev server at `http://127.0.0.1:3002`, with mock payments and mock AI. Existing app at `127.0.0.1:3001` points to `devmentor_test` on port 5433 and was stopped before testing to release Next's shared dev lock; it was not used as the target.  
**Seed:** repository `npm run db:seed` directed only to `devmentor_qa`, then synthetic accounts, accepted bookings/messages, one session note, and released vault answers inserted into that database. No external provider or real user data used.  
**Time:** 2026-11-15 11:32 UTC. Full request/response and DB snapshots: `.ai/qa/access-audit-2026-11-15/api-results.json`.

## Summary

Three model threats were selected by high impact and access/isolation relevance: T-03, T-04, T-08. For all three, the two accounts' own-resource positive controls succeeded; cross-account reads and writes/actions were denied; the relevant DB snapshots were unchanged. These results apply only to this isolated development configuration and synthetic fixtures. Historical lesson-16 evidence is listed separately and is not used as proof for the current checks.

### Card 1 — T-03: cross-account session data

```yaml
Karta dowodu
Wymaganie / hipoteza: Seeker A cannot read or append messages to a booking owned by seeker B; both legitimate participants can read their own session.
Zakres i ryzyko: GET/POST /api/bookings/{id}/messages; confidential session content, high impact.
Baza i docelowy commit: b8bc5a98dd433f340975b9f29a1cf59d14749c63; docs-only audit changes pending.
Środowisko, seed, konto i czas: Dedicated devmentor_qa DB on port 5434 migrated and demo-seeded; two seeker fixtures not created. Isolated app startup failed. 2026-11-15 10:55 UTC setup.
Sprawdzenie (komenda / żądanie / scenariusz): `node .ai/tmp/run-access-audit.mjs`; A=`GET /api/bookings/4896d049-641b-4db5-b128-9dad248165c3/messages` 200; B=`GET /api/bookings/184d37ba-53aa-4c07-83ab-fbc802ab4cb0/messages` 200; A then `GET` and `POST {"body":"unauthorized synthetic write"}` to B's messages endpoint.
Oczekiwane zachowanie: Both owners get 200 for own booking/messages; cross-account GET/POST denied; messages row set unchanged.
Rzeczywisty wynik i miejsce dowodu: Controls A and B HTTP 200. Cross GET HTTP 403 `{"ok":false,"error":{"code":"forbidden","message":"You are not allowed to do this."}}`; cross POST same HTTP 403/code. B booking message rows before and after are identical: one row (`328aa3b3-e616-4575-b846-59d2ff75a38d`, author B, synthetic body). Full sanitized transcript/snapshots in `api-results.json` → `checks.t03`.
Czego to sprawdzenie nie dowodzi: Does not test other endpoints, note ownership, expired/non-accepted sessions, concurrency, production configuration, or mentor-specific access to this booking.
Decyzja i osoba odpowiedzialna: No boundary crossing in this tested case; project owner remains accountable. No confirmed finding or regression test indicated.
```

### Card 2 — T-04: operator privilege boundary

```yaml
Karta dowodu
Wymaganie / hipoteza: Seeker/mentor cannot list operator users or perform an operator action; operator account can access its own authorized operator resource.
Zakres i ryzyko: GET /api/operator/users and one state-changing operator route; unauthorized privilege escalation, high impact.
Baza i docelowy commit: b8bc5a98dd433f340975b9f29a1cf59d14749c63; docs-only audit changes pending.
Środowisko, seed, konto i czas: Dedicated devmentor_qa DB on port 5434 migrated and demo-seeded; isolated app startup failed. 2026-11-15 10:55 UTC setup.
Sprawdzenie (komenda / żądanie / scenariusz): Same isolated runner script. Operator `GET /api/operator/users` 200; seeker `GET /api/auth/me` 200; seeker then `GET /api/operator/users` and `POST /api/operator/terms/drafts` with valid synthetic seeker draft.
Oczekiwane zachowanie: Operator positive control succeeds; seeker denied; no operator data or state change.
Rzeczywisty wynik i miejsce dowodu: Operator and seeker positive controls HTTP 200. Seeker cross GET and POST both HTTP 403 with `error.code=forbidden`. `terms_versions` rows matching `audit-%` count before=0 and after=0. Full response bodies/snapshots in `api-results.json` → `checks.t04`.
Czego to sprawdzenie nie dowodzi: Does not enumerate every operator endpoint or validate operator audit/approval workflows; the user-list positive control verifies only this operator session and route.
Decyzja i osoba odpowiedzialna: No privilege crossing in tested read/write routes; project owner remains accountable. No confirmed finding.
```

### Card 3 — T-08: vault answer cross-seeker isolation

```yaml
Karta dowodu
Wymaganie / hipoteza: Seeker A cannot read or mutate seeker B's paid vault answer by changing its ID; both seekers can access their own answers.
Zakres i ryzyko: GET /api/vault-answers/{id}, relevant POST action (e.g. mock-payment/reconcile); private question/answer and payment state, high impact.
Baza i docelowy commit: b8bc5a98dd433f340975b9f29a1cf59d14749c63; docs-only audit changes pending.
Środowisko, seed, konto i czas: Dedicated devmentor_qa DB on port 5434 migrated and demo-seeded. Vault enabled only in intended app process, which failed to start. No vault fixtures created. 2026-11-15 10:55 UTC setup.
Sprawdzenie (komenda / żądanie / scenariusz): Same isolated runner script. A and B each `GET /api/vault-answers/{ownId}`; A then `GET` and `POST {"outcome":"complete"}` to B's `/api/vault-answers/{id}/mock-payment` endpoint.
Oczekiwane zachowanie: Both positive controls succeed; A denied on B's answer/actions; answer/payment status and rows unchanged.
Rzeczywisty wynik i miejsce dowodu: A and B positive GET controls HTTP 200. Cross GET HTTP 404 `error.code=not_found`; cross mock-payment POST HTTP 403 `error.code=forbidden`. B's answer row (`d35e2068-20b7-492c-9f5a-12ea3f4e9fe9`) before and after has the same seeker, `released` status and answer text. Full response bodies/snapshots in `api-results.json` → `checks.t08`.
Czego to sprawdzenie nie dowodzi: Does not test mentor reviewer access, payment reconciliation, other answer states, AI generation, provider behavior, or production configuration.
Decyzja i osoba odpowiedzialna: No cross-seeker access in tested read/action case; project owner remains accountable. No confirmed finding.
```

## Historical evidence, not current acceptance

`.ai/qa/lesson-16/verification.json` records one successful historical operator-vs-seeker session-message attempt. The seeker read a booking with HTTP 200; the operator passed a positive operator control (`GET /api/operator/users`, 200); operator message GET and POST returned 403; returned message list was unchanged. It lacks a second legitimate seeker positive control and a direct database snapshot, so it does not meet the current evidence rule. Its session ended at 10:31:57Z; it was verified at 10:07:58Z.

## Decision

No access-control finding was confirmed by fresh API evidence. Therefore this run adds no regression tests claiming red/green for a confirmed flaw. The three tested boundaries have positive controls, denials and DB state comparisons; their stated scope limitations still apply.
