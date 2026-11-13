<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`.

<!-- END:nextjs-agent-rules -->

# DevMentor — Task Router

**Monorepo:** Next.js 16 + React 19 + TypeScript + Tailwind + MikroORM + Awilix + PostgreSQL

**Architecture:** `app/ -> core/ -> db/`, `ui/` via `app/` only. Import direction enforced by ESLint.

## Hard Rules (Never Override)

- **No `any`** — write an interface instead
- **No CSS-in-JS** — Tailwind only
- **No raw `fetch`** — use `apiCall` from `@devmentor/ui` for `/api/*` endpoints only
- **No `@mikro-orm/*` outside `db/`** package
- **No `next`/`react` imports in `core/`**
- **Passwords:** bcrypt cost 12, length 10-72
- **Sessions:** JWT HS256, 24h, `httpOnly`, `SameSite=Lax`, `Secure` in prod, secret from `.env.local` (min 32 chars)
- **CSRF:** Header `x-requested-with: devmentor` + Origin check on all mutations
- **Ownership:** Every mutation checks `assertOwns` — record author from session, never request body

## Routing Table

### General Tasks
| Task | Read |
|------|------|
| Project overview, architecture | This file |
| Engineering standards | `.ai/specs/engineering-standards.md` |
| Design system | `docs/design-system.md` |
| Product brief | `.ai/specs/product-brief.md` |
| AI documentation structure | This file (see below) |
| Best practices for Claude | `CLAUDE.md` |

### Task Types
| Task | Read |
|------|------|
| Bug fix | `CLAUDE.md`, then affected package AGENTS.md |
| New feature | Relevant spec in `.ai/specs/`, then package AGENTS.md |
| Refactor | Spec + affected package AGENTS.md |
| Code Review | This file + package AGENTS.md |
| Security review | `.ai/specs/engineering-standards.md` + package AGENTS.md |

### UI Tasks
| Task | Read |
|------|------|
| UI components | `packages/ui/AGENTS.md` |
| Design system | `docs/design-system.md` |
| UI patterns | `packages/ui/AGENTS.md` |

### API/Backend Tasks
| Task | Read |
|------|------|
| API routes | `packages/app/AGENTS.md` |
| HTTP layer | `packages/core/AGENTS.md` |
| Business logic | `packages/core/AGENTS.md` |

### Database Tasks
| Task | Read |
|------|------|
| Entities, migrations | `packages/db/AGENTS.md` |
| Repositories | `packages/db/AGENTS.md` |

### Package Reference
| Package | AGENTS.md | Focus |
|---------|-----------|-------|
| `app/` | `packages/app/AGENTS.md` | Next.js routing, pages, API handlers |
| `core/` | `packages/core/AGENTS.md` | Business logic, services, validators, DI |
| `db/` | `packages/db/AGENTS.md` | Entities, repositories, migrations |
| `ui/` | `packages/ui/AGENTS.md` | Components, hooks, styles |

## Package Summaries

### app/
Next.js application — routing, pages, API route handlers, E2E tests. Deployment entry point.

### core/
Business logic — framework-agnostic. Services, validators (Zod), types, HTTP utilities, DI container.

### db/
Database layer — MikroORM entities, repositories, migrations. Only package importing `@mikro-orm/*`.

### ui/
UI components — shadcn primitives, Tailwind, React hooks, backend patterns. Standalone.

## .ai Structure

- `.ai/specs/` — Specifications (format: `YYYY-MM-DD-slug.md`)
- `.ai/specs/implemented/` — Completed specs
- `.ai/specs/archive/` — Abandoned specs
- `.ai/runs/` — Autonomous run logs
- `.ai/lessons/` — Lessons learned + `lessons.md` index

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build app (includes type-check) |
| `npm run lint` | ESLint on packages |
| `npm run type-check` | TypeScript check |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run migrate` | Database migrations |
| `npm run audit:prod` | Security audit |
