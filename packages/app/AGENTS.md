<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code.

<!-- END:nextjs-agent-rules -->

# DevMentor App — Next.js

**Purpose:** Routing, pages, API handlers, static assets. Deployment entry point.

## Structure
```
packages/app/src/app/
├── (marketing)/    # Public pages
├── (auth)/         # Login, register
├── (mentor)/       # Mentor dashboard
├── (seeker)/       # Seeker dashboard
├── api/<concept>/  # Route handlers
└── api/health/     # Health check
```

## Routing
- **Page:** `<segment>/page.tsx` → default export `<Segment>Page`
- **API:** `<concept>/route.ts` → export HTTP methods (GET, POST, etc.)
- **Dynamic:** `[id]/page.tsx` or `[...slug]/page.tsx`

## Route Groups
- `(marketing)/` — Public-facing pages
- `(auth)/` — Authentication flows
- `(mentor)/` — Mentor-only pages
- `(seeker)/` — Seeker pages

## API Patterns
- **CRUD:** Use `makeCrudRoute` from `@devmentor/core`
- **Custom:** Use `apiHandler` from `@devmentor/core`
- **Auth:** Use `requireSession`, `optionalSession` from `@devmentor/core`

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run test:e2e` — Run E2E tests

## Environment
- `.env.local` (gitignored)
- Required: DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL
- Optional: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
