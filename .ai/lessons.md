# Lessons Learned — Ustalenia i wnioski projektu

Spis wszystkich ustaleń, wniosków i usprawień odkrytych w trakcie pracy nad projektem.

## Jak korzystać

- Każdy wpis poniżej zawiera link do szczegółowej notatki w katalogu `lessons/`
- Czytaj te notatki, aby unikać powtórzenia błędów i zrozumieć decyzje projektowe
- Po odkryciu czegoś ważnego dodaj nowy wpis poniżej i utwórz szczegółową notatkę w `lessons/YYYY-MM-DD-slug.md`

## Aktualne lekcje

- [2026-10-19 — `next build` pada przy `NODE_ENV=development`](lessons/2026-10-19-next-build-node-env.md) — buduj z `NODE_ENV=production`; to nie jest problem duplikatu Reacta.
- [2026-10-19 — Hooki React w barrelu `core`](lessons/2026-10-19-core-barrel-react-hooks.md) — hooki w osobnym entry poincie `@devmentor/core/hooks`.
- [2026-10-19 — Tailwind v4 bez zmiany wyglądu](lessons/2026-10-19-tailwind-v4-no-preflight-layers.md) — bez preflight, stare style w `@layer base`, `@source` dla `ui`.
- [2026-10-19 — MikroORM v6: EM, daty, migracje w Jest](lessons/2026-10-19-mikroorm-v6-em-and-jest.md) — EM przez `fork()`, `types.datetime`, `down()` ręcznie, `migrationsList` w testach.
- [2026-10-19 — Minifikacja nazw klas a MikroORM](lessons/2026-10-19-minified-class-names-mikroorm.md) — jawne `tableName`; E2E na buildzie produkcyjnym.
- [2026-10-19 — Render w przeglądarce i Tailwind bez preflightu](lessons/2026-10-19-render-check-and-preflight.md) — zrzuty ekranu ujawniły błędy niewidoczne w testach; resety w komponentach; Chromium bez roota.
- [2026-10-19 — Standardy vs istniejący kod](lessons/2026-10-19-standards-vs-existing-code.md) — stosuj zasady, odkładaj warstwy bez konsumenta; egzekwuj granice ESLintem.
- [2026-10-19 — Pułapki warstwy auth i API](lessons/2026-10-19-auth-layer-pitfalls.md) — `loadEnvConfig` bez forceReload, CSRF a Host, normalizacja Zod, emiter zdarzeń, jose w Jest.
- [2026-11-05 — Izolowanie testów integracyjnych z bazą](lessons/2026-11-05-db-integration-test-isolation.md) — reset schematu, `EntityManager.fork()`, kompletne fixture'y i asercje niezależne od wersji PostgreSQL.

---

## Szablony dla nowych wpisów lekcji

Podczas tworzenia nowej lekcji w `lessons/` użyj następującego szablonu:

```markdown
---
date: YYYY-MM-DD
topic: [temat główny lekcji]
status: [active|archived]
---

# Tytuł lekcji

## Kontekst
Opisz sytuację i problem, jaki pojawił się.

## Czego się nauczyliśmy
Wyjaśnij odkrycie, zrozumienie lub wzorzec, który odkryłeś.

## Jak to stosować
Praktyczne instrukcje dla przyszłych prac — co robić (lub czego nie robić) w przyszłości.

## Powiązane resources
- Link do issuesów
- Link do commitów
- Link do innego materiału

## Dalsze wymagane działania
Jeśli jest coś, co trzeba jeszcze zrobić lub zbadać.
```
- [Session notes depend on session identity](lessons/2026-11-13-session-notes-boundaries.md): a session UUID cannot establish participant access; keep notes owner-only until E01 exists, and do not merge them into the E02 vault corpus.
