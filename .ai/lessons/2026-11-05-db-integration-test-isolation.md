---
date: 2026-11-05
topic: database integration tests
status: active
---

# Keep database integration tests isolated and self-contained

## Context

The repository integration suite had not run against a clean PostgreSQL instance for several phases. Once it did, failures exposed migration state leaking between tests, ORM calls through MikroORM's global `EntityManager`, an invalid Jest suite nested inside a test, incomplete booking fixtures, and time assertions based on when the test resumed rather than the stored transition time.

## What we learned

- Reset the dedicated test schema and apply real migrations before each integration test that can alter migration state.
- Use `orm.em.fork()` for context specific ORM reads and writes.
- Keep every Jest `describe` and `it` at suite declaration scope; Jest rejects suites declared while a test is running.
- Fixtures must satisfy the current database foreign keys, including mentor profiles for mentor booking IDs.
- Assert time boundaries against the persisted event timestamp, not a later wall-clock sample.
- Inspect PostgreSQL catalog expressions such as `pg_get_expr(indpred, indrelid)` when asserting partial indexes; formatted `pg_indexes.indexdef` varies by PostgreSQL version.

## How to apply it

Run database integration tests against the dedicated `devmentor_test` database. Configure `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, and `DATABASE_PASSWORD` to match the local PostgreSQL service, then run `npm run test:integration`. Never point these tests at the development database because the suite drops and recreates its schema.

## Related resources

- `packages/db/src/repositories/repositories.integration.test.ts`
- `packages/db/test/setup-env.ts`

## Follow-up

None.
