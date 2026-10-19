---
date: 2026-10-19
title: DevMentor Monorepo Setup — Specyfikacja architekturalny
status: superseded-by-migration-plan
---

# DevMentor — Setup struktury monorepo

## Cel

Ustanowienie struktury monorepo dla aplikacji DevMentor z podziałem na cztery niezależne pakiety, każdy odpowiadający za jasno określoną warstwę aplikacji.

> Ten dokument opisuje docelową strukturę. Stan wdrożenia i fazy migracji: `2026-10-19-devmentor-monorepo-migration-plan.md`.

## Struktura docelowa

### Struktura pakietów

```
packages/
├── app/              # Next.js aplikacja (frontend + API routes)
├── core/            # Wielokrotnie używalny kod
├── db/              # Warstwa danych (MikroORM)
└── ui/              # Komponenty interfejsu
```

### 1. packages/app/ — Główna aplikacja Next.js

- **Technologia:** Next.js 16+, React 19, TypeScript
- **Struktura:**
  - `src/app/` — App Router (strony, layouty)
  - `src/app/api/` — API routes (route handlers)
- **Zależności:** @devmentor/core, @devmentor/db, @devmentor/ui
- **Odpowiedzialność:** Routing, UI, API endpoints

### 2. packages/core/ — Logika biznesowa i utilitki

- **Struktura:**
  - `src/types/` — TypeScript types (User, Article, itp.)
  - `src/utils/` — Funkcje pomocnicze (formatDate, delay, itp.)
  - `src/hooks/` — React hooks (useAsync, itp.)
  - `src/constants/` — Stałe aplikacji (API_BASE_URL, ERROR_MESSAGES)
- **Niezależny od frameworka** — można używać w Node.js lub przeglądarce
- **Brak zależności od** app, db, ui

### 3. packages/db/ — Warstwa danych

- **ORM:** MikroORM (TypeScript-first, migracje, pooling)
- **Struktura:**
  - `src/config/` — Konfiguracja MikroORM i pool połączeń
  - `src/entities/` — Modele danych (User, Article)
  - `src/repositories/` — Warstwa abstrakcji dostępu (UserRepository, ArticleRepository)
  - `src/migrations/` — Migracje bazy danych
- **Baza:** PostgreSQL
- **Zależności:** @devmentor/core

### 4. packages/ui/ — Komponenty interfejsu

- **CSS Framework:** Tailwind CSS + shadcn-ui
- **Struktura:**
  - `src/components/` — Komponenty React (Button, Card, itp.)
  - `src/hooks/` — UI-specificzne hooks (useDebounce, useMediaQuery)
  - `src/styles/` — Globalne Tailwind CSS
- **Zależności:** @devmentor/core, React, Tailwind CSS

## Konfiguracja

### Root package.json

- npm workspaces dla monorepo
- Komendy dla `dev`, `build`, `start`, `migrate`, `lint`, `type-check`, `test`

### TypeScript

- **Root tsconfig.json** — Base config z path aliases dla wszystkich pakietów
- **Path aliases:**
  - `@devmentor/core` → `packages/core/src/index.ts` (+ `@devmentor/core/hooks`)
  - `@devmentor/db` → `packages/db/src/index.ts`
  - `@devmentor/ui` → `packages/ui/src/index.ts`
  - `app` nie ma aliasu — jest konsumentem pakietów, nie zależnością

### Package.json dla każdego pakietu

- `app/` — skrypty Next.js (`dev`, `build`, `start`) + `type-check`
- `core/`, `db/`, `ui/` — tylko `type-check` (`tsc --noEmit`); pakiety wewnętrzne, konsumowane jako źródło TS

## Konwencje kodowe

- **Komponenty React:** PascalCase (`UserCard.tsx`)
- **Funkcje/Utils:** camelCase (`formatDate.ts`)
- **Stałe:** UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Foldery:** kebab-case (`user-service/`)

## Next steps

1. Setup zależności pakietów (npm install)
2. Skonfigurować MikroORM — `.env.local` z DATABASE_URL
3. Stworzyć pierwsze migracje
4. Dodać Next.js stronę welcome w `packages/app/src/app/`
5. Testować struktura importów między pakietami

## Zmiane od poprzedniej wersji

- Było: Single app
- Jest: Monorepo z 4 niezależnymi pakietami
- Wdrożone: AGENTS.md, README.md, tsconfig.json, package.json dla każdego pakietu

