---
date: 2026-10-19
topic: minifikacja nazw klas a MikroORM, oraz po co testy E2E na buildzie produkcyjnym
status: active
---

# Minifikacja produkcyjna zmienia nazwy klas encji

## Kontekst
Trasy API z bazą działały w `next dev`, a w `next start` zwracały 500: `relation "u" does not exist`.

## Czego się nauczyliśmy
MikroORM wyprowadza domyślną nazwę tabeli z nazwy klasy. Minifikator serwerowego bundla Next.js (Turbopack) przemianował
`class User` na `u`. Dev nie minifikuje, więc błąd ujawnia się dopiero w buildzie produkcyjnym — wychwycił go test E2E
uruchamiany na `next build` + `next start`.

## Jak to stosować
- Każda encja ma jawne `@Entity({ tableName: '...' })`. Relacje wskazuj przez funkcję (`() => User`), nie przez nazwę-string.
- Zachowania zależne od `constructor.name` (ORM, DI po nazwie, serializacja) testuj na buildzie produkcyjnym, nie tylko w dev.
- Nowy `*.test.ts` o innym typie (integration/e2e) trzeba wykluczyć z projektu `unit` w `jest.config.mjs`.
