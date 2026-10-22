# Code review rules

Applied automatically by `om-code-review` (and so by `om-auto-review-pr`) on top of its built-in checklist. Human reviewers use the same list. Rules come from `AGENTS.md` and `.ai/specs/engineering-standards.md`; when they disagree with this file, fix the disagreement in the same PR.

## Review priorities

1. **Correctness** — does it do what the ticket says, including the failure paths?
2. **Security** — auth, ownership, CSRF, input validation, secrets, data leaving the server.
3. **Contracts** — API shape, DB schema, events, package entry points (see `BACKWARD_COMPATIBILITY.md`).
4. **Package boundaries** — dependency direction and where code lives.
5. **Tests and readability** — last, and never a substitute for the first four.

## Repo-specific checks

### Package boundaries (`eslint.config.mjs` enforces most of these; check what lint cannot)

- Direction is `app → core → db`; `ui` is importable by `app` only. `@mikro-orm/*` appears only in `packages/db`. `core` never imports `next` or `react`.
- `app` reaches the database only through `@devmentor/core/server`, never `@devmentor/db` directly.
- Client code imports `@devmentor/core` (isomorphic entry), never `@devmentor/core/server`.
- Domain code lives in `<layer>/<concept>/` folders. A concept folder is added together with its first file; empty scaffolds are a finding.

### HTTP routes (`packages/app/src/app/api/**/route.ts`)

- Handlers are wrapped in `apiHandler` or built with `makeCrudRoute`. A hand-written `try/catch` or a hand-built error response is a finding.
- Responses use the `{ ok, data | error }` envelope; stack traces and raw errors never reach the client.
- Services throw `AppError` subclasses and never build HTTP responses.
- Route files stay wiring only: validate → auth → one service call → envelope. Business rules in a route are a finding.
- Routes that touch the database export `dynamic = "force-dynamic"`; the app must still build and boot with no database and no secrets.

### Validation and security

- Every input passes through a shared Zod schema from `packages/core/src/validators/<concept>/` (`parseOrThrow`). No schema is redefined in a route or a form.
- Mutating routes require a session, the `x-requested-with: devmentor` header and an `Origin` that matches the host (`assertCsrfSafe`).
- **Ownership, not roles:** every mutation on a record checks its owner (`assertOwns`, deny by default). The author or owner id comes from the session, never from the request body. There is no `requireRole`.
- No mass assignment: write only the fields the schema names.
- Entities never leave `core`. Return DTOs (`toUserDto`, `toArticleDto`) so fields like `passwordHash` cannot reach a response.
- Passwords: bcrypt cost 12, length 10–72. Session: JWT HS256, 24 h, cookie `httpOnly`, `SameSite=Lax`, `Secure` in production. `JWT_SECRET` comes from the environment only, never from the repo. Login errors stay generic.
- New log lines go through the shared logger (it masks passwords, tokens, JWTs, cookies). `console.log` of request data is a finding.
- Auth endpoints keep their rate limiting; a new credential-style endpoint needs one too.

### Data layer

- Entities use `defineEntity` with explicit `name` and `tableName` (snake_case, plural). Minified class names break MikroORM otherwise.
- Schema changes ship as a new migration from `migration:create` with a working `down()`. Editing an existing migration is a **blocker**.
- Data access goes through `packages/db/src/repositories/` and the container; services take dependencies from the Awilix cradle, registered by hand in `container.ts`.
- Check-then-write on shared state (availability, bookings, payments) runs in one transaction.

### Events and integrations

- Event ids are `concept.entity.action`, past tense. A new event needs an `EventMap` entry and a line in `logging-subscriber.ts`. Services emit after a successful mutation; payloads carry ids, not personal data.
- External vendors are used through a port in `core` plus an adapter, never imported straight into a service.

### UI

- Network calls to `/api/*` use `apiCall` / `apiCallOrThrow`; a raw `fetch` is a finding. Forms use `CrudForm` with the server's Zod schema, lists use `DataTable`, and loading/error/empty states use `feedback/*`.
- New components go where `AGENTS.md` says (shadcn primitive via the CLI, panel pattern, concept component, or next to its page). Tailwind classes only: no CSS-in-JS.

### TypeScript and tests

- Strict mode, no `any`; prefer branded ids for new id types.
- Unit tests sit next to the file (`x.ts` + `x.test.ts`). Changes to repositories or migrations need a test in the `db` project; user-facing flows need an E2E check in `packages/app/e2e`.
- A bug fix carries a regression test that fails without the fix.

## Severity

| Level | Examples | Effect |
|---|---|---|
| **Blocker** | Missing ownership check or CSRF check; secret or hash in a response; edited old migration; migration without `down()`; broken package boundary; breaking a contract in `BACKWARD_COMPATIBILITY.md` without its required path; failing validation gate | `changes-requested` |
| **Major** | Hand-rolled error handling or fetch; business rules in a route; schema duplicated between client and server; missing transaction; missing test for new behaviour | `changes-requested` |
| **Minor** | Naming, file placement, small duplication, comments | Approve, or fix in the same PR |
| **Nit** | Taste | Approve; file a follow-up only if it keeps recurring |

A `risk-high` PR (auth, sessions, schema migrations, shared contracts; see `SDLC.md`) also needs the evidence listed there, or `om-code-review` blocks it.

## Validation gate

The commands in `.ai/agentic.config.json` must pass: `npm run type-check`, `npm run lint`, `npm test`, `npm run build`. CI additionally runs the dependency audit, migrations up/down/up with seed, integration tests and E2E; a red CI check is a blocker finding.
