---
date: 2026-10-19
topic: MikroORM v6 — globalny EntityManager, typy dat, migracje w Jest
status: active
---

# MikroORM v6: pułapki wykryte przy fazie bazy danych

## Kontekst
Szkielet `db` z fazy 1 type-checkował się, ale nie działał: seed i repozytoria padały dopiero na prawdziwej bazie.

## Czego się nauczyliśmy
- `orm.em` (globalny EM) rzuca `ValidationError` przy zapytaniach poza `RequestContext`. Repozytoria przyjmują
  `EntityManager` z zewnątrz; wołający daje `orm.em.fork()` (żądanie, skrypt, test).
- `@Property({ type: 'date' })` to kolumna `date` bez godziny. Dla znaczników czasu użyj `types.datetime` (`timestamptz`).
  Typ kolumny widać od razu: `mikro-orm schema:create --dump`.
- `migration:create` ze snapshotem generuje tylko `up()`, a snapshot jest nadpisywany przez każdą bazę, na której uruchomiono
  migracje (`devmentor_test`, `devmentor_e2e`) i potrafi spłaszczyć się do pustego schematu po `migrate:down`. Dlatego `snapshot: false`:
  `migration:create` porównuje encje z bazą i generuje `up()` oraz `down()` (sprawdzone na tymczasowej kolumnie).
- Jest (CJS) nie załaduje migracji przez dynamiczny `import()` MikroORM — rejestruj klasy przez `migrations.migrationsList`.
- Config czytający `process.env` przy imporcie wymaga, by `.env` załadować wcześniej: osobny moduł z efektem
  ubocznym importowany jako pierwszy (wywołanie funkcji po importach jest za późno).
- Jest 29 ładuje `jest.config.mjs` przez `require` — bez top-level `await`; eksportuj funkcję async.

## Jak to stosować
Testy z bazą trzymaj w `*.integration.test.ts` (projekt `db`), z osobną bazą testową. Nigdy nie czytaj `DATABASE_URL`
bez sprawdzenia, na jaką bazę wskazuje w danym środowisku.
