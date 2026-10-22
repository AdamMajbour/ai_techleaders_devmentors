# Backward compatibility

What this repository treats as a protected contract surface, and the path a change to one must take. `om-code-review` and `om-auto-review-pr` check changes against this file; implementation skills warn when a change breaks it.

**Context:** DevMentor is a private application (`"private": true`, version 0.1.0) with a single deployment, not a published library. Compatibility matters because (a) the database holds live data that migrations must carry forward, (b) the browser and server ship together but a deploy is not atomic, and (c) other packages and sessions already in the field depend on shapes defined in one place. Keep the rules proportionate: a deprecation window here means "one release that supports both", not a long public policy.

## Protected surfaces

### 1. Database schema and migrations (`packages/db/src/migrations/`, `entities/`)

- **Breaking:** dropping or renaming a table or column, narrowing a type, adding a `NOT NULL` column without a default or backfill, adding a unique constraint that existing rows may violate, changing `tableName` of an entity.
- **Required path:** a new migration (never edit an existing one) with a working `down()`; destructive changes go in two steps (add the new shape and migrate data, then remove the old one in a later migration); the PR body states the rollback plan. CI runs `migrate`, `migrate:down`, `migrate` and the seed; it must stay green. Label `risk-high`.

### 2. HTTP API (`packages/app/src/app/api/**`)

Current routes: `GET /api/health`, `POST /api/auth/{register,login,logout}`, `GET /api/auth/me`, `GET|POST /api/articles`, `GET|PUT|DELETE /api/articles/[id]`.

- **Breaking:** removing or renaming a route, method, query parameter or body field; making an optional input required; changing a field's type or meaning; changing a status code or an error `code`; changing the envelope `{ ok, data | error: { code, message, fieldErrors? } }`; changing the `x-requested-with: devmentor` CSRF requirement.
- **Not breaking:** adding an optional input field, adding a response field, adding a route.
- **Required path:** add the new form next to the old, move the client (`ui`, pages) over in the same PR, remove the old form in a later PR. The response DTOs (`UserDto`, `ArticleDto`, `Page<T>`) are part of this surface.

### 3. Sessions and cookies (`packages/core/src/security/`)

- **Breaking:** changing the cookie name (`SESSION_COOKIE`), the JWT claims or algorithm, the signing secret's variable name (`JWT_SECRET`), or the cookie attributes in a way that logs everyone out.
- **Required path:** call out in the PR that existing sessions are invalidated, or accept the old and new form for one release. There are no refresh tokens, so a change takes effect at the 24 h expiry at the latest. Label `risk-high`.

### 4. Domain events (`packages/core/src/events/event-map.ts`)

- **Breaking:** renaming an event id (`concept.entity.action`), removing an event, or removing or retyping a payload field subscribers may read.
- **Not breaking:** a new event, a new optional payload field.
- **Required path:** emit the old and new event for one release, or update every subscriber in the same PR; update `logging-subscriber.ts`.

### 5. Package entry points

`@devmentor/core` (isomorphic), `@devmentor/core/server`, `@devmentor/db`, `@devmentor/ui` and their exports, as listed in each `src/index.ts` / `package.json` `exports`.

- **Breaking:** removing or renaming an export, changing a signature or return type, moving a symbol between the isomorphic and server entry (it can break client bundles).
- **Required path:** update all in-repo consumers in the same PR; for a rename keep a re-export of the old name for one release when more than one package uses it. Shared Zod schemas (`validators/**`) are consumed by both routes and forms, so tightening one is an API change (surface 2).

### 6. Configuration and environment

`.env.example` names the variables (`DATABASE_*`, `JWT_SECRET`), and `core/src/config/env.ts` validates them lazily.

- **Breaking:** renaming or removing a variable, making an optional one required, or requiring a secret to build or start the app (it must build and boot with no database and no secrets).
- **Required path:** update `.env.example`, `README.md` and CI in the same PR; state the new requirement in the PR body.

### 7. npm scripts used by CI and the pipeline

`npm run` scripts named in `.github/workflows/ci.yml` and `.ai/agentic.config.json` (`type-check`, `lint`, `test`, `build`, `migrate`, `migrate:down`, `db:seed`, `test:integration`, `test:e2e`, `audit:prod`).

- **Breaking:** renaming or removing one, or changing what it covers.
- **Required path:** update the workflow, the config and `SDLC.md` together.

## Not protected

`packages/app/src/app/ui-preview`, page markup and styling, `packages/ui` component internals (only the exports in surface 5 count), and anything under `.ai/` other than `agentic.config.json`.

## Review behaviour

- A change on a protected surface that skips its required path is a **blocker**.
- A change that is safe but touches a surface should say so in the PR body ("adds optional field, not breaking").
- When unsure whether a change is breaking, treat it as breaking and ask the maintainer.
