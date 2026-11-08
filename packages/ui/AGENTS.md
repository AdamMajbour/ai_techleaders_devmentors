# DevMentor UI — Component Library

**Purpose:** shadcn components, Tailwind styling, React hooks. Standalone, no core/db imports.

## Structure
```
packages/ui/src/
├── backend/
│   ├── api/apiCall.ts       # Only fetch to /api/* with CSRF
│   ├── forms/CrudForm.tsx   # Zod validation, Ctrl+Enter submit
│   ├── tables/DataTable.tsx # Pagination, sorting, actions
│   └── feedback/            # ErrorMessage, EmptyState, LoadingMessage
├── components/
│   ├── <concept>/           # Domain-specific components
│   └── ui/                  # shadcn primitives (CLI)
├── hooks/                   # React hooks (useAsync, useDebounce)
└── styles/                  # Tailwind tokens, globals.css
```

## Component Placement
1. **shadcn primitive** → `components/ui/` (via `npx shadcn@latest add`)
2. **Panel pattern** → `backend/<category>/`
3. **Domain component** → `components/<concept>/`
4. **Page-specific** → Next to `page.tsx` in `app/`

## Key Components
- **apiCall:** Only allowed fetch() to `/api/*`, sets `x-requested-with: devmentor`
- **CrudForm:** Same Zod schema as server, field errors, keyboard shortcuts
- **DataTable:** Loading/empty/error states, pagination, row actions

## React Hooks
- `useAsync` — Async operations with states
- `useDebounce` — Debounce input
- `useLocalStorage` — Sync with localStorage
- `useMediaQuery` — Responsive hooks
- `useOnClickOutside` — Detect outside clicks
- `useToggle` — Boolean toggle state

## Tailwind
- **Config:** In `app/tailwind.config.ts` (references ui/)
- **Tokens:** Custom in `styles/tokens.css`
- **Global:** `styles/globals.css`
- **Rule:** No CSS-in-JS — Tailwind only

## Design System
**READ FIRST:** `docs/design-system.md`
- Product character, component usage table
- Semantic tokens, decision guides
- Storybook reference

## UI Rules
- **Language:** English only
- **Terms:** seeker, mentor, session, booking, question (from design-system.md)
- **Styling:** Utility classes only

## Commands
- `npx shadcn@latest add <component>` — Add primitive
- `npm run storybook` — View components (in ui/ package)
