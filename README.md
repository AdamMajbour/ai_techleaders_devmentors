# DevMentor

Platforma edukacyjna do mentoringu i rozwoju umiejętności programistycznych zbudowana na nowoczesnym stosie technologicznym.

## 💡 Koncepcja produktu

Wstępna koncepcja portalu mentoringowego, inspirowanego sprawdzonymi funkcjami i przepływami **Preply.com**. Preply jest tu traktowany wyłącznie jako **benchmark funkcjonalny i UX** — identyfikacja wizualna, treści oraz kod serwisu nie są kopiowane ani odwzorowywane.

Projekt jest realizowany jako aplikacja Next.js i służy jako miejsce pracy nad koncepcją (dokumentacja + klikalne mockupy), a nie jako produkcyjna implementacja platformy.

### Zakres koncepcji

Zgodnie z przyjętym briefem, efektem prac ma być:

1. **Lista użytkowników systemu i ich potrzeb** — role (np. uczeń/student, mentor/korepetytor, administrator) wraz z ich celami i oczekiwaniami wobec platformy.
2. **Najważniejsze use case'y oraz kompletne przepływy użytkownika** — m.in. rejestracja, wyszukiwanie i dobór mentora, rezerwacja i realizacja lekcji, płatności, komunikacja, oceny i opinie.
3. **Mapa ekranów i nawigacji** — struktura aplikacji i relacje między ekranami dla poszczególnych ról.
4. **Specyfikacja każdego ekranu**, obejmująca:
   - cel ekranu,
   - dostępne funkcje,
   - komponenty UI,
   - stany: `loading`, `empty`, `error`, `success`,
   - walidacje,
   - powiązane endpointy API.
5. **Klikalne mockupy (HTML/CSS/TypeScript)** obejmujące wszystkie kluczowe ścieżki użytkownika.

> Status: koncepcja wstępna / work in progress. Powyższe elementy będą dodawane iteracyjnie (dokumentacja w repozytorium, mockupy jako osobne widoki aplikacji).

### Uwaga dotycząca benchmarku

Preply.com służy wyłącznie jako punkt odniesienia dla sprawdzonych wzorców funkcjonalnych i przepływów UX w branży mentoringu/korepetycji. Wszystkie elementy wizualne, treściowe i implementacyjne tego projektu są tworzone niezależnie.

## 🏗️ Architektura

DevMentor jest aplikacją **monorepo** zorganizowaną w cztery główne pakiety, każdy z jasno zdefiniowaną odpowiedzialnością:

### Struktura pakietów

```
packages/
├── app/              # Główna aplikacja Next.js (frontend + API routes)
├── core/            # Wielokrotnie używalny kod (logika biznesowa, types, utils)
├── db/              # Warstwa danych (MikroORM entities, migracje, repositories)
└── ui/              # Komponenty interfejsu (shadcn-ui, custom komponenty)
```

> **Uwaga:** aplikacja Next.js (App Router) mieszka w `packages/app/src/app/`. Pakiety `core`, `db` i `ui` są wewnętrzne — używane jako kod źródłowy TypeScript (`transpilePackages`), bez osobnego kroku budowania do `dist/`. Hooki React z `core` importuj z `@devmentor/core/hooks`, a `@devmentor/db` tylko z kodu serwerowego.

### Przepływ zależności

```
app/ (konsumuje)
  ↓
core/, ui/, db/ (niezależne, mogą zależeć od siebie)
```

- **app/** — Next.js aplikacja z App Router
  - Strony frontendowe w `app/` katalogu
  - API routes w `app/api/`
  - Server components, Client components
  - Nie zawiera logiki biznesowej — deleguje do `core/`, `db/`, `ui/`

- **core/** — Logika biznesowa i utilitki
  - `utils/` — funkcje pomocnicze
  - `types/` — TypeScript types i interfaces
  - `hooks/` — React hooks do logiki biznesowej
  - `constants/` — stałe aplikacji
  - Niezależny od frameworka — może być używany w Node.js lub przeglądarce

- **db/** — Zarządzanie danymi
  - `entities/` — MikroORM modele danych
  - `repositories/` — warstwa abstrakcji dostępu do danych
  - `migrations/` — migracje bazy danych
  - `config/` — konfiguracja MikroORM i connection pool
  - Obsługuje: lazy loading, pooling, migracje, relationships

- **ui/** — Komponenty interfejsu
  - `components/` — shadcn-ui + custom komponenty
  - `hooks/` — UI-specificzne hooks
  - `styles/` — globalne Tailwind CSS
  - Wykorzystuje Tailwind i shadcn-ui dla spójności
  - Tokeny i style globalne: `@devmentor/ui/styles` (importowane w `globals.css` aplikacji)

## 🛠️ Stack techniczny

| Warstwa | Technologia |
|---------|------------|
| **Framework** | Next.js 16+ (najnowsza wersja) |
| **Język** | TypeScript (strict mode) |
| **UI** | React 19 |
| **CSS** | Tailwind CSS + shadcn-ui |
| **Baza danych** | PostgreSQL |
| **ORM** | MikroORM (TypeScript-first, migracje, pooling) |
| **DI** | Awilix (lekki kontener zależności) |
| **Package Manager** | npm (workspaces) |

## 🚀 Getting Started

### Wymagania
- Node.js 20.9+ (wymóg Next.js 16)
- PostgreSQL 14+
- npm 9+

### Instalacja

```bash
# Zainstaluj zależności dla wszystkich pakietów
npm install

# PostgreSQL lokalnie (albo własny serwer) i połączenie z bazą (zobacz „Zmienne środowiskowe”)
docker compose up -d db
cp .env.example .env.local

# Migruj bazę danych (tworzy bazę, jeśli jej brakuje) i opcjonalnie załaduj dane demo
npm run migrate
npm run db:seed

# Uruchom dev server
npm run dev
```

### Dostępne komendy

```bash
npm run dev          # Uruchom dev server (app/)
npm run build        # Type-check pakietów + build aplikacji (uruchamiaj z NODE_ENV=production)
npm run start        # Uruchom aplikację (po build)
npm run migrate      # Uruchom migracje bazy danych
npm run migrate:down # Wycofaj ostatnią migrację
npm run db:seed      # Dane demo (idempotentne, wymaga migracji)
npm run lint         # Sprawdź linting
npm run type-check   # Sprawdzenie typów TypeScript
npm run test         # Testy jednostkowe (bez bazy)
npm run test:integration # Testy repozytoriów i migracji (wymaga PostgreSQL)
npm run test:e2e     # Build + start aplikacji, testy HTTP i w Chromium (wymaga PostgreSQL i Chromium)
```

## 📁 Konwencje projektowe

### Nazewnictwo
- **Komponenty React:** `PascalCase` (`UserCard.tsx`)
- **Funkcje/Utils:** `camelCase` (`formatDate.ts`, `useUserForm.ts`)
- **Stałe:** `UPPER_SNAKE_CASE` (`API_BASE_URL`, `MAX_RETRIES`)
- **Foldery:** `kebab-case` (`user-service/`, `auth-guards/`)

### Importy
- Importy względne wewnątrz pakietu
- Importy bezwzględne dla pakietów monorepo: `@devmentor/core`, `@devmentor/db`, `@devmentor/ui`

### Struktura pliku
```typescript
// 1. Importy
// 2. Typy i interfejsy
// 3. Stałe
// 4. Komponenty / Funkcje
// 5. Exports
```

## 🗄️ Baza danych

### MikroORM

- **Entities** — modele w `packages/db/src/entities/`
- **Migracje** — w `packages/db/src/migrations/`; bez pliku snapshotu (`snapshot: false`), więc `migration:create` porównuje encje z aktualną bazą — najpierw `npm run migrate`
- **Repositories** — warstwa abstrakcji w `packages/db/src/repositories/`; konstruktor przyjmuje `EntityManager` (`orm.em.fork()` na żądanie/skrypt), bo MikroORM zabrania użycia globalnego EM
- **Connection Pool** — zarządzane przez MikroORM

### Migracje

```bash
# Utwórz nową migrację
npm --workspace=@devmentor/db run migration:create

# Uruchom wszystkie migracje
npm run migrate

# Wycofaj ostatnią migrację
npm run migrate:down
```

**Zasady:**
- Nigdy nie edytuj starych migracji — zawsze utwórz nową
- Migracje muszą być reversible (up i down) — `migration:create` generuje oba; sprawdź wygenerowany `down()`
- Commituj migracje do git

## 🧩 Dependency Injection (Awilix)

Kontener jest w `packages/app/src/server/container.ts` (tylko kod serwerowy):

- `orm` — singleton (jedna pula połączeń na proces), tworzony leniwie przy pierwszym żądaniu
- `em`, `userRepository`, `articleRepository` — **scoped**: każde żądanie dostaje własny scope i własny `EntityManager` (`fork()`)

```ts
const { cradle } = await createRequestScope();
const user = await cradle.userRepository.findByEmail(email);
```

Przykłady użycia: `GET /api/users?email=…` i `GET /api/articles?authorId=…` (`packages/app/src/app/api/`).
Aplikacja czyta `DATABASE_*` z `.env.local` w korzeniu repozytorium (`next.config.ts`).

## 🧪 Testowanie

- **Unit i komponentowe:** `packages/core/`, `packages/ui/`, `packages/app/src/server/` (Jest + React Testing Library, jsdom)
- **Testy integracyjne:** `packages/db/` (`*.integration.test.ts`) — prawdziwy PostgreSQL, osobna baza `devmentor_test`
  (nazwa z `DATABASE_TEST_NAME`); odtwarzają schemat z migracji, więc nie dotykają bazy deweloperskiej
- **Component testy:** `packages/ui/`
- **E2E:** `packages/app/e2e/` — `next build` + `next start` na wolnym porcie, własna baza `devmentor_e2e` (`DATABASE_E2E_NAME`),
  migrowana i zasilana tymi samymi skryptami npm co w pracy deweloperskiej; strony i API sprawdzane po HTTP, a strony dodatkowo
  renderowane w headless Chromium (obliczone style, błędy konsoli)
- **Framework:** Jest + React Testing Library
- **Lokalizacja:** `component.tsx` + `component.test.tsx`

```bash
npm run test              # Testy jednostkowe
npm run test:integration  # Testy z bazą danych
npm run test:e2e          # Build + serwer + testy HTTP i w przeglądarce
npm run test:all          # Wszystkie trzy
npm run test:watch        # Watch mode
```

### Środowisko testowe

- **PostgreSQL:** `docker compose up -d db` (`docker-compose.yml`, dane logowania = domyślne z `packages/db/src/config`).
  Testy integracyjne i E2E same tworzą bazy `devmentor_test` i `devmentor_e2e`.
- **Chromium (testy przeglądarkowe w E2E):** `npx playwright install --with-deps chromium` (wymaga roota). Bez roota:
  `npx playwright install chromium && python3 scripts/setup-chromium-libs.py` — skrypt pobiera brakujące biblioteki systemowe
  (Debian/Ubuntu, amd64) do `~/.cache/chromium-libs`, a test sam dodaje je do `LD_LIBRARY_PATH` (katalog: `CHROMIUM_LIBS_DIR`).
- **CI:** `.github/workflows/ci.yml` (type-check, lint, testy jednostkowe, migracje up/down/up + seed, testy integracyjne,
  E2E z Chromium, build produkcyjny) z usługą `postgres:17`.

### shadcn-ui

`packages/ui/components.json` i `packages/app/components.json` konfigurują CLI (`npx shadcn@latest add <komponent> --cwd packages/ui`).
Aliasy `@devmentor/ui/components|lib|hooks/*` są wyeksportowane w `package.json` pakietu i zmapowane w `tsconfig`.
Uwaga: CLI 4.22.1 generuje obecnie import `import { cn } from "cn"` (także w zwykłym projekcie Next.js — to problem rejestru/CLI,
nie konfiguracji, `shadcn info` rozwiązuje aliasy poprawnie) i dopisuje zależność `cn`. Po `shadcn add` popraw import na
`../lib/utils` i usuń zbędne zależności. Aplikacja nie ładuje preflightu Tailwinda, więc komponenty muszą same resetować natywne style
(patrz `Button`).

## 📝 Dokumentacja

- **AGENTS.md** — Instrukcje dla AI, architektura, Best Practices
- **CLAUDE.md** — Instrukcje dla Claude, korzystanie ze struktury `.ai/`
- **.ai/specs/** — Specyfikacje projektowe (SDD)
- **.ai/runs/** — Logi autonomicznych przebiegów AI
- **.ai/lessons/** — Ustalenia i wnioski z pracy

## 🔐 Zmienne środowiskowe

Skopiuj `.env.example` do `.env.local` w katalogu głównym i dostosuj. Używamy osobnych zmiennych `DATABASE_*`, a nie `DATABASE_URL`, żeby nie uruchomić migracji na cudzej bazie ustawionej w środowisku. `NODE_ENV` ustawia Next.js — nie ustawiaj go ręcznie:

```env
# Database (czytane przez MikroORM CLI i seed; wzór w .env.example)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=devmentor
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Application
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🚀 Deployment

Aplikacja jest deployowana na **Vercel**:

```bash
# Build jest automatyczny na push do main
npm run build

# Preview na staging (push do develop)
# Production na main
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MikroORM Documentation](https://mikro-orm.io)
- [Awilix Documentation](https://github.com/jeffijoe/awilix)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn-ui](https://ui.shadcn.com)

## 📄 Licencja

Proprietary — DevMentor
