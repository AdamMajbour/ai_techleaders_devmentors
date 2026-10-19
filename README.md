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

> **Uwaga:** na obecnym etapie działająca aplikacja Next.js (App Router) znajduje się w katalogu głównym `src/app/`, a `packages/app` jest na razie szkieletem.

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
- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Instalacja

```bash
# Zainstaluj zależności dla wszystkich pakietów
npm install

# Migruj bazę danych
npm run migrate

# Uruchom dev server
npm run dev
```

### Dostępne komendy

```bash
npm run dev          # Uruchom dev server (app/)
npm run build        # Zbuduj aplikację produkcyjną
npm run start        # Uruchom aplikację (po build)
npm run migrate      # Uruchom migracje bazy danych
npm run lint         # Sprawdź linting
npm run type-check   # Sprawdzenie typów TypeScript
npm run test         # Uruchom testy
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

- **Entities** — modele w `packages/db/entities/`
- **Migracje** — automatyczne w `packages/db/migrations/`
- **Repositories** — warstwa abstrakcji w `packages/db/repositories/`
- **Connection Pool** — zarządzane przez MikroORM

### Migracje

```bash
# Utwórz nową migrację
npm run mikro-orm migration:create

# Uruchom wszystkie migracje
npm run migrate

# Wycofaj ostatnią migrację
npm run migrate:down
```

**Zasady:**
- Nigdy nie edytuj starych migracji — zawsze utwórz nową
- Migracje muszą być reversible (up i down)
- Commituj migracje do git

## 🧪 Testowanie

- **Unit testy:** `packages/core/`, `packages/db/`
- **Component testy:** `packages/ui/`
- **E2E testy:** `packages/app/`
- **Framework:** Jest + React Testing Library
- **Lokalizacja:** `component.tsx` + `component.test.tsx`

```bash
npm run test          # Uruchom wszystkie testy
npm run test:watch   # Watch mode
```

## 📝 Dokumentacja

- **AGENTS.md** — Instrukcje dla AI, architektura, Best Practices
- **CLAUDE.md** — Instrukcje dla Claude, korzystanie ze struktury `.ai/`
- **.ai/specs/** — Specyfikacje projektowe (SDD)
- **.ai/runs/** — Logi autonomicznych przebiegów AI
- **.ai/lessons/** — Ustalenia i wnioski z pracy

## 🔐 Zmienne środowiskowe

Utwórz `.env.local` w root katalogu:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/devmentor

# Application
NODE_ENV=development
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
