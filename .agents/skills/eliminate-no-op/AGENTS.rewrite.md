<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`.

<!-- END:nextjs-agent-rules -->

# DevMentor — Architecture and Technical Foundations

## Stack techniczny

- **Framework:** Next.js (latest) with TypeScript
- **UI Framework:** React 19
- **CSS:** Tailwind CSS (frontend), shadcn-ui components (backend)
- **Database:** PostgreSQL
- **ORM:** MikroORM — handles migrations, connection pooling, lazy loading
- **Dependency Injection:** Awilix — lightweight, efficient DI container for TypeScript
- **Package Manager:** npm (monorepo with workspaces)

## Monorepo Structure

```
packages/
├── app/                      # Next.js: routing, pages, route handlers (api/)
│   ├── src/app/              # App Router; route groups per persona, e.g. (marketing)/
│   ├── public/               # Static assets
│   └── e2e/                  # E2E tests (build + start + HTTP + Chromium)
├── core/                     # Business logic, framework-agnostic (no next/react)
│   ├── src/http/             # errors.ts (AppError), apiHandler.ts, makeCrudRoute.ts, auth.ts, body.ts, envelope.ts
│   ├── src/security/         # password (bcrypt 12), session (JWT HS256 + cookie), csrf, rate-limit
│   ├── src/events/           # typed in-process emitter: event-bus.ts, event-map.ts
│   ├── src/config/env.ts     # Zod, read lazily (app builds and starts without secrets)
│   ├── src/container/        # Awilix: container.ts, cradle.ts
│   ├── src/services/<concept>/<name>.service.ts
│   ├── src/validators/<concept>/<name>.schema.ts   # Zod, shared client/server
│   ├── src/{types,utils,constants,logger.ts}
│   ├── src/index.ts          # isomorphic entry (safe in client)
│   └── src/server.ts         # server entry: container, services, apiHandler
├── db/                       # Only package importing @mikro-orm/*
│   ├── src/entities/<concept>/<name>.entity.ts     # defineEntity, snake_case tables plural
│   ├── src/repositories/     # Data access (accept EntityManager)
│   ├── src/migrations/       # Migrations (up and down)
│   └── src/config/           # MikroORM config
└── ui/                       # Standalone: does not import core or db
    ├── src/components/ui/    # shadcn primitives (CLI), src/components/<concept>/ — concept components
    ├── src/backend/          # General panel patterns: api/apiCall.ts (only allowed fetch to /api/*), forms/CrudForm, tables/DataTable, feedback/*
    ├── src/hooks/            # React hooks (useAsync, useDebounce, ...)
    └── src/styles/           # Tokens and global Tailwind styles
```

**Import direction enforced by ESLint (`no-restricted-imports`):** `app → core → db`, `ui` importable only through `app`; `core` does not import `next`/`react`; `@mikro-orm/*` only in `db`.

## Domain Concept Convention

Domain code is NOT divided into `modules/`. Each concept (`auth`, `mentors`, `availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, ...) is a subdirectory with the same name, repeated across layers that need it:

- `packages/db/src/entities/<concept>/<name>.entity.ts`
- `packages/core/src/services/<concept>/<name>.service.ts`
- `packages/core/src/validators/<concept>/` (shared Zod schemas when needed)
- `packages/app/src/app/api/<concept>/route.ts` and corresponding `page.tsx` in persona route groups

A concept directory is created only with the first file — never empty skeletons. This is a directory convention, not a runtime module system: no per-concept setup/ACL/auto-discovery. Full naming table, payment port patterns and event emitter patterns: `.ai/specs/engineering-standards.md`.

**Event IDs:** `concept.entity.action` (e.g., `articles.article.created`), emitted by the service after a successful mutation through the typed emitter in `packages/core/src/events` (`eventBus` in `Cradle`, registry in `event-map.ts`) — in-process only, no queues/workers; exception in subscriber is logged and does not break the mutation. New event = entry in `EventMap` and in `logging-subscriber.ts`.

## Reusable API & UI Layer

Every route and page uses two shared layers instead of custom fetch/validation/auth/error handling:

- **Core layer (`packages/core/src/http/`)** — `errors.ts` (AppError hierarchy), `apiHandler.ts` (catches AppError, maps to status and JSON envelope `{ ok, data | error }`, logs unexpected errors, never returns stack trace). Routes do not have their own try/catch. `makeCrudRoute.ts` (Zod schemas + service methods → `{ GET, POST, PUT, DELETE }`; mutations always require session and CSRF header) and `auth.ts` (`requireSession`, `optionalSession`, `assertOwns`; no `requireRole` as the product has no RBAC). Pattern: `packages/app/src/app/api/articles/`.

- **UI layer (`packages/ui/src/backend/`)** — `api/apiCall.ts` (only allowed fetch() to /api/*), `forms/CrudForm.tsx` (same Zod schema as server, field errors from server, Ctrl/Cmd+Enter and Escape), `tables/DataTable.tsx` (loading/empty/error states, pagination, row actions), `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`. Pattern: `packages/app/src/app/(marketing)/articles/`.

## Security (minimum from `.ai/specs/engineering-standards.md`)

- **Passwords:** bcrypt, cost 12, length 10-72. **Sessions:** JWT HS256, valid 24h, secret `JWT_SECRET` (min. 32 characters, from `.env.local`, never in repo), cookie `httpOnly`, `SameSite=Lax`, `Secure` in production. No refresh tokens.
- **CSRF:** Every state-changing request must have header `x-requested-with: devmentor` (apiCall always sets it), and `Origin` must match the host. Rate limiting for login and registration in process memory (to be replaced with shared storage).
- **Ownership, not roles:** Every mutation checks the record owner (`assertOwns`, default deny). Record author always comes from the session, never from the request body; input data passes through Zod schema (no mass assignment). Login errors are generic.
- **Logging:** Masks passwords/tokens/JWT/cookies; entities do not leave `core` (DTO), so password hashes never reach responses.
- **Audit:** `npm run audit:prod` in CI (threshold: critical).

**Design system:** Before building or changing a screen, read `docs/design-system.md` as the first file (product character, components with "when to use and when not to" table, semantic tokens, "if... then use..." guides, what to avoid, commands). Full documentation is Storybook in `packages/ui` (`npm run storybook` in that directory).

**UI language:** English. Product terms (seeker, mentor, session, booking, question): `docs/design-system.md`, Content section.

**Component placement:**
1. shadcn primitive → `ui/src/components/ui/` (via `npx shadcn@latest add`, not manually — exception: Button and Card written manually due to CLI bug, see README)
2. General panel pattern independent of concept → `ui/src/backend/<category>/`
3. Component tied to a domain concept → `ui/src/components/<concept>/`
4. Used by a single page → next to its `page.tsx`, until a second consumer appears

## Architectural Principles

### 1. Package Isolation
- `app/` contains Next.js logic and routing
- `core/` contains business logic, independent of framework
- `db/` manages everything related to the database
- `ui/` contains only components and styling

### 2. Dependency Injection with Awilix
- Register services in DI container (`packages/core/src/container/container.ts`) manually, one line per dependency — no `loadModules`
- Inject dependencies instead of creating them locally
- Facilitates testing and changing implementations
- Avoid couplings between layers

### 3. MikroORM and Database
- Define models via `defineEntity` in `packages/db/src/entities/<concept>/` (explicit `name` and `tableName`)
- Migrations in `packages/db/src/migrations/` (generate via `migration:create`, verify `down()`)
- Connection pool managed by MikroORM
- Repositories in `packages/db/src/repositories/` for data access abstraction; services in `core` use them via container

### 4. TypeScript Everywhere
- Strict mode: `"strict": true` in `tsconfig.json`
- No `any` — if you don't know the type, write an interface instead
- Shared types in `packages/core/src/types/`
- Use branded types for additional safety (e.g., UserId, ArticleId)

### 5. UI with Tailwind and shadcn-ui
- shadcn-ui for "business" components (forms, dialogs, tables)
- Custom components in `packages/ui/src/components/`
- Tailwind utility classes for styling
- No CSS-in-JS — everything in Tailwind

## Coding Conventions

### Naming
- **React Components:** PascalCase (`UserCard.tsx`)
- **Utils/hooks files:** camelCase (`useUserForm.ts`, `formatDate.ts`)
- **Constants:** UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRIES`)
- **Folders:** kebab-case (`user-service/`, `auth-guards/`)

### Imports
- Relative imports for the same package
- Absolute imports for monorepo packages: `@devmentor/core`, `@devmentor/db`, `@devmentor/ui`
- Path aliases in `tsconfig.json` for cleanliness

### File Structure
```typescript
// 1. Imports
// 2. Types and interfaces
// 3. Constants
// 4. Components / Functions
// 5. Exports (if needed)
```

## Migrations and Database

- Migrations stored in `packages/db/migrations/`
- Run migrations before deploy: `npm run migrate`
- Never edit old migrations — always create a new one
- Migrations must be reversible (up and down)

## Testing

- Unit tests for `core/` and `db/`
- Component tests for `ui/`
- E2E tests for `app/`
- Place tests next to the file: `component.tsx` + `component.test.tsx`
- Framework: Jest + React Testing Library (default in Next.js)

## Deployment

- `app/` is the Next.js application you deploy to Vercel/hosting
- `core/`, `db/`, `ui/` are internal packages — do not deploy them separately
- Build: `npm run build` in `app/` (should build dependencies from other packages)
- ENV variables: `.env.local` for dev, secrets in CI/CD

## .ai Structure — AI Documentation and Autonomous Runs

Project uses `.ai/` structure for central AI documentation and autonomous run logs.

### `.ai/specs/` — Specifications and SDD

- **Format:** `YYYY-MM-DD-slug.md` (e.g., `2026-10-19-auth-system-redesign.md`)
- **`implemented/`:** Specifications already implemented — move here after completion
- **`archive/`:** Old or abandoned specifications — archive after deprecation

**Instructions:**
- Each new specification should be created in `.ai/specs/` with a date stamp
- After implementation, move the file to `implemented/` with a comment about the version
- Never delete specifications — archive instead

### `.ai/runs/` — Autonomous Run Logs

- **Format:** `YYYY-MM-DD-slug.md` (e.g., `2026-10-19-performance-optimization-run.md`)
- **Content:** Goal, methods, results, conclusions, problems, next steps
- **Lifecycle:** After completion, keep the log as decision history

**Instructions:**
- Each autonomous run should record its actions and conclusions
- Logs serve as audit and shared knowledge for the team
- Make periodic entries (don't wait until the end) for progress tracking

### `.ai/lessons/` and `lessons.md` — Findings and Conclusions

- **`lessons.md`:** Index of all lessons with brief descriptions
- **`lessons/`:** Detailed notes for each lesson
- **Format in `lessons/`:** `YYYY-MM-DD-slug.md`
- **Content:** Context, what we learned, how to apply it, related bugfixes

**Instructions:**
- After each significant discovery (bug fix, problem analysis, design pattern), create an entry
- Link from `lessons.md` to detailed notes in `lessons/`
- Use these notes as long-term team memory — helps avoid repeating mistakes
- Update existing entries when new information or approach changes appear

## Best Practices for Effective Work with Claude

**Based on Boris Cherny's experience with Claude Code.**

### 1. Planning Before Implementation

For complex tasks, first create a specification in `.ai/specs/`:
- Define the problem, goals, and constraints
- List step-by-step what needs to be done
- Set success metrics

Do not say "improve this" — say "improve this by doing X in Y way".

### 2. Verification Before Commit

- Run tests, check type-checking, perform code review
- For UI changes: test in browser (happy path and edge cases)
- Review diffs before committing — catch surprises
- If something looks wrong, ask before it's too late

### 3. Document Lessons After Fixes

After each significant bug fix:
- Create an entry in `.ai/lessons/` documenting the root cause
- Add to `.ai/lessons.md` — prevents repeating mistakes
- If it was a long iteration — log it in `.ai/runs/`
- If you discovered a new rule — update CLAUDE.md

**Goal:** Every fix is a lesson for future work. Without documentation, knowledge is lost.

### 4. Advanced Prompting

- Be specific — say WHAT instead of "make it better"
- Provide context — link to file, line number, problem example
- Ask for specific style: "refactor for readability" vs. "simplify to 3 lines"
- Challenge for elegance — "can this be done without callbacks?" sometimes yields surprisingly good solutions

### 5. Automatic Fixing Instead of Management

- Instead of "analyze this error" — paste the error log and say "fix"
- Claude works better with a clear goal and autonomy
- Don't micromanage every step — set direction and let it work
- If you need more power — say "use subagents" for complex problems
