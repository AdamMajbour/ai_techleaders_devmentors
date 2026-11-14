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

> **Uwaga:** aplikacja Next.js (App Router) mieszka w `packages/app/src/app/`. Pakiety `core`, `db` i `ui` są wewnętrzne — używane jako kod źródłowy TypeScript (`transpilePackages`), bez osobnego kroku budowania do `dist/`. Kod serwerowy (kontener DI, serwisy, `apiHandler`) importuj z `@devmentor/core/server`; `@devmentor/core` (wejście izomorficzne) jest bezpieczne także w kliencie. Standardy: `.ai/specs/engineering-standards.md`.

### Przepływ zależności

```
app → core → db        ui: samodzielny, importowany tylko przez app
```

Wymuszane przez ESLint (`no-restricted-imports`): `core` nie importuje `next`/`react`, `ui` nie importuje `core`/`db`,
`app` nie importuje `db`, a `@mikro-orm/*` jest tylko w `db`.

- **app/** — Next.js aplikacja z App Router
  - Strony w `src/app/` (grupy tras per persona, np. `(marketing)/`)
  - Route handlers w `src/app/api/<koncept>/route.ts` — tylko `apiHandler` + walidacja + wywołanie serwisu
  - Nie zawiera logiki biznesowej — deleguje do `core/` i `ui/`

- **core/** — Logika biznesowa, niezależna od frameworka
  - `http/` — `AppError` i potomkowie, `apiHandler` (koperta JSON `{ ok, data | error }`)
  - `services/<koncept>/` — reguły biznesowe; `validators/<koncept>/` — schematy Zod współdzielone client/server
  - `container/` — Awilix (`container.ts`, `cradle.ts`); `logger.ts` — logger JSON z maskowaniem sekretów
  - `types/`, `utils/`, `constants/`
  - Wejścia: `@devmentor/core` (izomorficzne) i `@devmentor/core/server` (kontener, serwisy, `apiHandler`)

- **db/** — Zarządzanie danymi (jedyny pakiet z `@mikro-orm/*`)
  - `entities/<koncept>/<nazwa>.entity.ts` — `defineEntity`; tabele snake_case w liczbie mnogiej
  - `repositories/` — dostęp do danych; `migrations/`; `config/`

- **ui/** — Komponenty interfejsu (samodzielny)
  - `components/ui/` — prymitywy shadcn; `components/<koncept>/` — komponenty konceptu
  - `backend/api/` — `apiCall` (jedyne miejsce na `fetch` do `/api/*`)
  - `hooks/` — hooki React; `lib/` — `cn`
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

Jedna komenda przygotowuje środowisko lokalne (zależności, `.env.local` z wygenerowanym `JWT_SECRET`, PostgreSQL przez Docker, migracje i dane demo). Można ją uruchamiać wielokrotnie — wykonane kroki są pomijane:

```bash
npm run setup              # dodaj --no-seed (npm run setup -- --no-seed), aby pominąć dane demo
npm run dev
```

#### Ręcznie

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

Seed adds three local demo accounts. On the sign-in page, use **Continue as mock mentee**, **mock mentor**, or **mock operator**. Their credentials are `mock-mentee@devmentor.test` / `mock-mentee-password`, `mock-mentor@devmentor.test` / `mock-mentor-password`, and `mock-operator@devmentor.test` / `mock-operator-password`. The operator UUID is included in `.env.example`; replace `OPERATOR_USER_IDS` with explicitly approved IDs in any deployed environment. Mentee and mentor access is invitation-backed, and operator pages and API routes require the configured operator ID.

The local seed also creates a bookable slot for `mock-mentor` and publishes clearly marked synthetic seeker terms so the demo checkout can be exercised. These terms are for local development only; a production seed is rejected except for the isolated `devmentor_e2e` database when mock payments are enabled. Production checkout continues to require current reviewed terms and explicit seeker consent.

For GitHub role sign-in, set `DEMO_MENTEE_GITHUB_EMAIL`, `DEMO_MENTOR_GITHUB_EMAIL`, and `DEMO_OPERATOR_GITHUB_EMAIL` in `.env.local` to verified GitHub e-mail addresses. You can reuse one address for multiple roles for local testing, then use the corresponding **Continue as … with GitHub** button. These addresses map to the seeded `@devmentor.test` users; GitHub cannot verify the reserved `.test` addresses themselves. The operator account must also be listed in `OPERATOR_USER_IDS`.

### Dostępne komendy

```bash
npm run setup        # Jednorazowe przygotowanie środowiska lokalnego (idempotentne)
npm run dev          # Uruchom dev server (app/)
npm run build        # Type-check pakietów + build aplikacji (uruchamiaj z NODE_ENV=production)
npm run start        # Uruchom aplikację (po build)
npm run migrate      # Uruchom migracje bazy danych
npm run migrate:down # Wycofaj ostatnią migrację
npm run db:seed      # Dane demo (idempotentne, wymaga migracji)
npm run pilot:invite -- --help # Zaproszenia uczestników pilota
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

Kontener jest w `packages/core/src/container/` (tylko kod serwerowy, `@devmentor/core/server`). Każda zależność jest
rejestrowana ręcznie w `container.ts` i opisana w `cradle.ts` (bez `loadModules`):

- `logger`, `orm` — singletony (jedna pula połączeń na proces), ORM tworzony leniwie przy pierwszym żądaniu
- `em`, repozytoria, serwisy — **scoped**: każdy scope ma własny `EntityManager` (`fork()`)

```ts
export const GET = apiHandler(async (request) => {
  const { authorId } = parseOrThrow(articleListQuerySchema, { authorId: new URL(request.url).searchParams.get('authorId') });
  return withScope(({ articleService }) => articleService.listByAuthor(authorId));
});
```

Przykład: `packages/app/src/app/api/articles/` (`makeCrudRoute`). Odpowiedzi mają kopertę
`{ "ok": true, "data": … }` albo `{ "ok": false, "error": { "code", "message", "fieldErrors"? } }`.
Aplikacja czyta `DATABASE_*` i `JWT_SECRET` z `.env.local` w korzeniu repozytorium (`next.config.ts`, `forceReload` — bez niego
Next ładuje tylko pliki z `packages/app`).

## 🌐 API

| Trasa | Metoda | Dostęp | Opis |
|---|---|---|---|
| `/api/health` | GET | publiczna | Status procesu, bez bazy |
| `/api/auth/register` | POST | publiczna, limit | Tworzy konto i loguje (cookie sesji) |
| `/api/auth/login` | POST | publiczna, limit | Loguje; wszystkie błędy to `Invalid credentials.` |
| `/api/auth/logout` | POST | sesja | Czyści cookie |
| `/api/auth/me` | GET | sesja | Zalogowany użytkownik |
| `/api/articles?authorId=&page=&pageSize=` | GET | publiczna | Lista stronicowana |
| `/api/articles` | POST | sesja | Tworzy artykuł (autor = zalogowany) |
| `/api/articles/[id]` | GET / PUT / DELETE | GET publiczny, PUT i DELETE tylko autor | Jeden artykuł |

Każde żądanie zmieniające stan wymaga nagłówka `x-requested-with: devmentor` (używaj `apiCall` z `@devmentor/ui`).
Strony: `/login`, `/register`, `/articles` (lista z `DataTable`, formularz z `CrudForm`).

## 🧪 Testowanie

- **Unit i komponentowe:** `packages/core/`, `packages/ui/` (Jest + React Testing Library, jsdom)
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
npm run test:browser:install # Pobierz Chromium do testów przeglądarkowych
npm run test:all          # Wszystkie trzy
npm run test:watch        # Watch mode
```

### Środowisko testowe

- **PostgreSQL:** `docker compose up -d db` (`docker-compose.yml`, dane logowania = domyślne z `packages/db/src/config`).
  Testy integracyjne i E2E same tworzą bazy `devmentor_test` i `devmentor_e2e`.
- **Chromium (testy przeglądarkowe w E2E):** `npm run test:browser:install` (pobiera przeglądarkę Playwright; nie instaluje systemowych bibliotek). Na Debian/Ubuntu, jeśli brakuje bibliotek systemowych, użyj `npx playwright install --with-deps chromium` (wymaga roota). Bez roota:
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

# Sesja (JWT HS256): min. 32 losowe bajty, wygeneruj: openssl rand -base64 48
# Wymagane tylko przez trasy auth; aplikacja buduje się i startuje bez tego.
JWT_SECRET=

# Sign-in (magic link)
PUBLIC_SIGNUP=false
APP_BASE_URL=http://localhost:3000
OPERATOR_USER_IDS=
MENTOR_RESPONSE_WINDOW_MINUTES=120
REFUND_AUTO_APPROVE_REASONS=

# Mail delivery: console by default for development; HTTP mode uses Resend.
MAILER_MODE=console
MAILER_API_KEY=
MAIL_FROM=
```

`APP_BASE_URL` is the public HTTP(S) origin used for verification links; it is required when a magic-link request is made and is never inferred from request headers. `MAILER_MODE` defaults to `console` for local development. For deployed mail, set `MAILER_MODE=http`, `MAILER_API_KEY` (Resend API key), and `MAIL_FROM` (for example `DevMentor <no-reply@example.com>`). Keep provider keys and `JWT_SECRET` in deployment secrets, never in source control. The console mailer is for local development only.

Paid bookings use `MENTOR_RESPONSE_WINDOW_MINUTES` (default `120`, valid range 1–10,080). Leave `REFUND_AUTO_APPROVE_REASONS` empty until the pilot decision is recorded: settlement creates operator-only refund approvals and never executes a refund. Run `npm run bookings:settle` from a scheduler for the same idempotent expiry pass that booking reads trigger.

Payments default to `PAYMENTS_MODE=mock`. To use Stripe Checkout, set `PAYMENTS_MODE=stripe`, provide `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, and keep `PAYMENTS_LIVE_ENABLED=false` for test keys. A live `sk_live_` key is refused unless `PAYMENTS_LIVE_ENABLED=true`; do not enable live payments before the pilot launch gates are complete. Stripe credentials are validated only when a payment operation or payment webhook is used, so builds and unrelated routes do not need them.

The pilot uses invitation-based, one-time e-mail sign-in. Close public password registration with `PUBLIC_SIGNUP=false`. Invite founder A first with `npm run pilot:invite -- --email <email> --name <name> --role seeker`, have them request and consume a sign-in link, then run `npm run pilot:invite -- --list` to get their accepted user id. Set that id in `OPERATOR_USER_IDS` before inviting any other participants. Until it is set, no user has operator access.

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


Vault answers remain disabled by default (`VAULT_ENABLED=false`); mentor note publishing also requires `VAULT_PUBLISH_ENABLED=true`. AI generation defaults to mock, and live Anthropic calls require `AI_MODE=anthropic`, `AI_LIVE_ENABLED=true`, and `ANTHROPIC_API_KEY`. Keep these gates closed until the notice, terms, operator, scheduler, and rehearsal gates in the vault spec are recorded. Leave `REFUND_AUTO_APPROVE_REASONS` empty by default. Per D26, vault rejection, expiry, generation failure, and operator cancellation always require operator approval; vault reasons are rejected by the auto-approval setting. Schedule `npm run vault:settle` to expire overdue previews. Add `-- --include-ai` only on a scheduler with an explicit AI budget; this also invokes the external generation task. Neither command executes refunds.
