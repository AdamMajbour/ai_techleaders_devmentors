<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# DevMentor — Architektura i założenia techniczne

## Stack techniczny

- **Framework:** Next.js (najnowsza wersja) z TypeScript
- **UI Framework:** React 19
- **CSS:** Tailwind CSS (frontend), shadcn-ui komponenty (backend)
- **Baza danych:** PostgreSQL
- **ORM:** MikroORM — obsługuje migracje, pulę połączeń, lazy loading
- **Dependency Injection:** Awilix — lekki, wydajny kontener DI dla TypeScript
- **Package Manager:** npm (monorepo z workspace'ami)

## Struktura monorepo

```
packages/
├── app/                      # Next.js: routing, strony, route handlers (api/)
│   ├── src/app/              # App Router; grupy tras per persona, np. (marketing)/
│   ├── public/               # Zasoby statyczne
│   └── e2e/                  # Testy E2E (build + start + HTTP + Chromium)
├── core/                     # Logika biznesowa, niezależna od frameworka (bez next/react)
│   ├── src/http/             # errors.ts (AppError), apiHandler.ts, makeCrudRoute.ts, auth.ts, body.ts, envelope.ts
│   ├── src/security/         # password (bcrypt 12), session (JWT HS256 + cookie), csrf, rate-limit
│   ├── src/events/           # typowany emiter in-process: event-bus.ts, event-map.ts
│   ├── src/config/env.ts     # Zod, czytany leniwie (aplikacja buduje się i startuje bez sekretów)
│   ├── src/container/        # Awilix: container.ts, cradle.ts
│   ├── src/services/<concept>/<name>.service.ts
│   ├── src/validators/<concept>/<name>.schema.ts   # Zod, współdzielone client/server
│   ├── src/{types,utils,constants,logger.ts}
│   ├── src/index.ts          # wejście izomorficzne (bezpieczne w kliencie)
│   └── src/server.ts         # wejście serwerowe: kontener, serwisy, apiHandler
├── db/                       # Jedyny pakiet importujący @mikro-orm/*
│   ├── src/entities/<concept>/<name>.entity.ts     # defineEntity, tabele snake_case w l. mnogiej
│   ├── src/repositories/     # Dostęp do danych (przyjmują EntityManager)
│   ├── src/migrations/       # Migracje (up i down)
│   └── src/config/           # Konfiguracja MikroORM
└── ui/                       # Samodzielny: nie importuje core ani db
    ├── src/components/ui/    # Prymitywy shadcn (CLI), src/components/<concept>/ — komponenty konceptu
    ├── src/backend/          # Ogólne wzorce paneli: api/apiCall.ts (jedyne miejsce na fetch do /api/*), forms/CrudForm, tables/DataTable, feedback/*
    ├── src/hooks/            # Hooki React (useAsync, useDebounce, ...)
    └── src/styles/           # Tokeny i style globalne Tailwind
```

Kierunek zależności jest wymuszany przez ESLint (`no-restricted-imports`): `app → core → db`, `ui` importowalne
tylko przez `app`; `core` nie importuje `next`/`react`; `@mikro-orm/*` tylko w `db`.

### Domain concept convention

Kod domenowy nie jest podzielony na `modules/`. Każdy koncept (`auth`, `mentors`, `availability`, `bookings`,
`payments`, `messages`, `favorites`, `reviews`, ...) to podkatalog o tej samej nazwie powtórzony w warstwach, które go potrzebują:

- `packages/db/src/entities/<concept>/<name>.entity.ts`
- `packages/core/src/services/<concept>/<name>.service.ts`
- `packages/core/src/validators/<concept>/` (współdzielone schematy Zod, gdy potrzebne)
- `packages/app/src/app/api/<concept>/route.ts` i odpowiadające `page.tsx` w grupie tras persony

Katalog konceptu powstaje dopiero wraz z pierwszym plikiem — nigdy puste szkielety. To konwencja katalogów, a nie runtime
modułów: bez per-konceptowego setupu/ACL/auto-discovery. Pełna tabela nazewnictwa, wzorce portów płatności i emitera zdarzeń:
`.ai/specs/engineering-standards.md`.

ID zdarzeń: `concept.entity.action` (np. `articles.article.created`), emitowane przez serwis po udanej mutacji przez typowany
emiter w `packages/core/src/events` (`eventBus` w `Cradle`, rejestr w `event-map.ts`) — tylko in-process, bez kolejek/workerów;
wyjątek w subskrybencie jest logowany i nie psuje mutacji. Nowe zdarzenie = wpis w `EventMap` i w `logging-subscriber.ts`.

### Reusable API & UI layer

Każda trasa i strona używa dwóch współdzielonych warstw zamiast własnego fetch/walidacji/auth/obsługi błędów:

- `packages/core/src/http/` — `errors.ts` (hierarchia `AppError`), `apiHandler.ts` (łapie `AppError`, mapuje na status i
  kopertę JSON `{ ok, data | error }`, loguje nieoczekiwane błędy, nigdy nie zwraca stack trace). Trasy nie mają własnego
  `try/catch`. `makeCrudRoute.ts` (schematy Zod + metody serwisów → `{ GET, POST, PUT, DELETE }`; mutacje zawsze wymagają sesji
  i nagłówka CSRF) oraz `auth.ts` (`requireSession`, `optionalSession`, `assertOwns`; brak `requireRole`, bo produkt nie ma RBAC).
  Wzorzec: `packages/app/src/app/api/articles/`.
- `packages/ui/src/backend/` — `api/apiCall.ts` (jedyny dozwolony `fetch()` do `/api/*`), `forms/CrudForm.tsx` (ten sam schemat
  Zod co serwer, błędy pól z serwera, Ctrl/Cmd+Enter i Escape), `tables/DataTable.tsx` (stany loading/empty/error, paginacja,
  akcje wiersza), `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`. Wzorzec: `packages/app/src/app/(marketing)/articles/`.

### Bezpieczeństwo (minimum z `.ai/specs/engineering-standards.md`)

- Hasła: bcrypt, koszt 12, długość 10–72. Sesja: JWT HS256, ważny 24 h, sekret `JWT_SECRET` (min. 32 znaki, z `.env.local`,
  nigdy w repo), cookie `httpOnly`, `SameSite=Lax`, `Secure` w produkcji. Brak refresh tokenów (znane ograniczenie).
- CSRF: każde żądanie zmieniające stan musi mieć nagłówek `x-requested-with: devmentor` (`apiCall` ustawia go zawsze), a `Origin`
  musi zgadzać się z hostem. Rate limiting logowania i rejestracji w pamięci procesu (do zastąpienia współdzielonym magazynem).
- Własność, nie role: każda mutacja sprawdza właściciela rekordu (`assertOwns`, odmowa domyślna). Autor rekordu zawsze pochodzi z
  sesji, nigdy z ciała żądania; dane wejściowe przechodzą przez schemat Zod (brak mass assignment). Błędy logowania są ogólne.
- Logger maskuje hasła/tokeny/JWT/cookies; encje nie opuszczają `core` (DTO), więc hash hasła nie trafia do odpowiedzi.
- `npm run audit:prod` w CI (próg: critical).

**Design system:** zanim zbudujesz lub zmienisz ekran, przeczytaj `docs/design-system.md` jako pierwszy plik (charakter produktu, komponenty z tabelą „kiedy używać i kiedy nie”, tokeny znaczeniowe, przewodniki „jeśli… to użyj…”, czego unikać, komendy). Pełna dokumentacja to Storybook w `packages/ui` (`npm run storybook` w tym katalogu). Język interfejsu: angielski (zasady i słownik: `docs/design-system.md`, sekcja Content).

Nowy komponent wielokrotnego użytku ma jedno wyznaczone miejsce:

1. Prymityw shadcn → `ui/src/components/ui/` (przez `npx shadcn@latest add`, nie ręcznie — wyjątek: `Button` i `Card` napisane
   ręcznie z powodu błędu CLI, patrz README).
2. Ogólny wzorzec paneli niezależny od konceptu → `ui/src/backend/<category>/`.
3. Komponent związany z kształtem domeny jednego konceptu → `ui/src/components/<concept>/`.
4. Używany przez jedną stronę → obok jej `page.tsx`, dopóki nie pojawi się drugi konsument.

## Princypia architektoniczne

### 1. Izolacja pakietów
- Każdy pakiet ma swoją odpowiedzialność
- `app/` zawiera logikę Next.js i routing
- `core/` zawiera logikę biznesową, niezależną od frameworka
- `db/` zarządza wszystkim związanym z bazą danych
- `ui/` zawiera tylko komponenty i styling

### 2. Dependency Injection z Awilix
- Rejestruj serwisy w kontenerze DI (`packages/core/src/container/container.ts`) ręcznie, jedna linia na zależność — bez `loadModules`
- Wstrzykuj zależności zamiast tworzyć je localnie
- Ułatwia testowanie i zmianę implementacji
- Unikaj sprzężeń między warstwami

### 3. MikroORM i baza danych
- Definiuj modele przez `defineEntity` w `packages/db/src/entities/<concept>/` (jawne `name` i `tableName`)
- Migracje w `packages/db/src/migrations/` (generuj przez `migration:create`, sprawdź `down()`)
- Pulę połączeń zarządza MikroORM
- Repositories w `packages/db/src/repositories/` dla abstrakcji dostępu do danych; serwisy w `core` używają ich przez kontener

### 4. TypeScript everywhere
- Strikt mode: `"strict": true` w `tsconfig.json`
- Bez `any` — jeśli nie wiesz typ, zamiast tego napisz interface
- Wspólne typy w `packages/core/src/types/`
- Wykorzystuj branded types dla dodatkowej bezpieczeństwa (np. UserId, ArticleId)

### 5. UI z Tailwind i shadcn-ui
- shadcn-ui dla "business" komponentów (forms, dialogs, tables)
- Custom komponenty w `packages/ui/components/`
- Tailwind utility classes dla stylizacji
- Brak CSS-in-JS — wszystko w Tailwind

## Konwencje kodowe

### Nazewnictwo
- **Komponenty React:** PascalCase (`UserCard.tsx`)
- **Pliki utils/hooks:** camelCase (`useUserForm.ts`, `formatDate.ts`)
- **Stałe:** UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRIES`)
- **Foldery:** kebab-case (`user-service/`, `auth-guards/`)

### Importy
- Importy względne dla tego samego pakietu
- Importy bezwzględne dla pakietów z monorepo: `@devmentor/core`, `@devmentor/db`, `@devmentor/ui`
- Path aliases w `tsconfig.json` dla czystości

### Struktura pliku
```typescript
// 1. Importy
// 2. Typy i interfejsy
// 3. Stałe
// 4. Komponenty / Funkcje
// 5. Exports (jeśli trzeba)
```

## Migracje i baza danych

- Migracje przechowywane w `packages/db/migrations/`
- Uruchamiaj migracje przed deployem: `npm run migrate`
- Nigdy nie edytuj starych migracji — zawsze utwórz nową
- Migracje muszą być reversible (up i down)

## Testy

- Unit testy dla `core/` i `db/`
- Component testy dla `ui/`
- E2E testy dla `app/`
- Umieść testy obok pliku: `component.tsx` + `component.test.tsx`
- Framework: Jest + React Testing Library (domyślnie w Next.js)

## Deployment

- `app/` jest aplikacją Next.js, którą deployujesz na Vercel/hosting
- `core/`, `db/`, `ui/` są pakietami wewnętrznymi — nie deployujesz ich osobno
- Build: `npm run build` w `app/` (powinien budować zależności z innych pakietów)
- ENV zmienne: `.env.local` dla dev, secrets w CI/CD

---

# Struktura .ai — dokumentacja AI i autonomiczne przebiegi

Projekt używa struktury `.ai/` do centralnego zarządzania dokumentacją AI i logami autonomicznych przebiegów.

## Katalog `.ai/specs/` — Specyfikacje i SDD

Miejsce przechowywania specyfikacji dla Software Design Documents (SDD) oraz innych specyfikacji projektowych.

- **Format nazwy:** `YYYY-MM-DD-slug.md` (np. `2026-10-19-auth-system-redesign.md`)
- **Podkatalog `implemented/`:** Specyfikacje już wdrożone — przenieś tutaj po zakończeniu implementacji
- **Podkatalog `archive/`:** Stare lub porzucone specyfikacje — archiwizuj po deprecacji

**Instrukcje:**
- Każda nowa specyfikacja powinna być stworzona w `.ai/specs/` ze znacznikiem daty
- Po wdrożeniu przenieś plik do `implemented/` z komentarzem dotyczącym wersji wdrożenia
- Nigdy nie usuwaj specyfikacji — archiwizuj zamiast tego

## Katalog `.ai/runs/` — Logi autonomicznych przebiegów AI

Miejsce do logowania wyników autonomicznych przebiegów, eksperymentów i iteracyjnych optymalizacji.

- **Format nazwy:** `YYYY-MM-DD-slug.md` (np. `2026-10-19-performance-optimization-run.md`)
- **Zawartość:** Cel, metody, wyniki, wnioski, problemy i dalsze kroki
- **Cykl życia:** Po zakończeniu przebiegu zachowaj log jako historię decyzji

**Instrukcje:**
- Każdy autonomiczny przebieg powinien rejestrować swoje działania i wnioski
- Logi służą jako audyt i źródło wspólnej wiedzy dla zespołu
- Rób periodyczne wpisy (nie czekaj do końca) dla śledzenia postępu

## Katalog `.ai/lessons/` i plik `lessons.md` — Ustalenia i wnioski

Miejsce do zbierania ustaleń, wniosków i długoterminowych usprawnień.

- **Plik `lessons.md`:** Indeks wszystkich lekcji z krótkim opisem
- **Podkatalog `lessons/`:** Szczegółowe notatki dla każdej lekcji
- **Format nazwy w `lessons/`:** `YYYY-MM-DD-slug.md`
- **Treść:** Kontekst, co się nauczyliśmy, jak to stosować, powiązane bugfixes

**Instrukcje:**
- Po każdym znaczącym odkryciu (naprawa błędu, analiza problemu, wzorzec projektowy) utwórz wpis
- Linki z `lessons.md` do szczegółowych notatek w `lessons/`
- Używaj tych notatek jako długoterminowej pamięci zespołu — pomagają unikać powtórzenia błędów
- Aktualizuj istniejące wpisy gdy pojawią się nowe informacje lub zmiany w podejściu

---

# Best Practices — Wskazówki dla efektywnej pracy z Claude

Wdrożone na podstawie doświadczeń Borisa Cherny'ego z Claude Code.

## 1. Planowanie przed implementacją

Dla złożonych zadań najpierw utwórz specyfikację w `.ai/specs/`:
- Zdefiniuj problem, cele i ograniczenia
- Wypisz krok po kroku, co ma być zrobione
- Ustal metryki sukcesu
- Zamiast mówić "zrób to", powiedz "zrób to w taki sposób"
- Claude wykonuje takie zadania precyzyjniej, szybciej i z mniej iteracjami

**Gdy pytanie jest skomplikowane:** Rozsyłaj pracę do wielu subagentów równolegle zamiast pytać sekwencyjnie.

## 2. Weryfikacja zmian przed zatwierdzeniem

- Uruchom testy, sprawdź type-checking, dokonaj przeglądu kodu
- Dla zmian UI: przetestuj w przeglądarce (złota ścieżka i edge case'i)
- Patrz na diffs zanim coś zacommitiasz — wychwyć niespodzianki
- Jeśli coś wygląda dziwnie, pytaj zanim nie będzie za późno

## 3. Zapisywanie wniosków po poprawkach

Po każdej znaczącej naprawie błędu:
- Utwórz wpis w `.ai/lessons/` dokumentujący root cause
- Dodaj do `.ai/lessons.md` — to zapobiega powtarzaniu błędów
- Jeśli była długa iteracja — zaloguj to w `.ai/runs/`
- Jeśli odkryłeś nową zasadę — zaktualizuj CLAUDE.md

**Cel:** Każda naprawa to lekcja dla przyszłych prac. Bez zapisania, wiedza ginie.

## 4. Zaawansowane promptowanie

- Bądź szczegółowy i specyficzny — powiedz COŚ zamiast "zrób to lepiej"
- Podaj kontekst — link do pliku, numer linii, przykład problemu
- Pytaj o konkretny styl: "refaktoruj aby było bardziej czytelne" vs. "uprość to do 3 linii"
- Wyzwij do elegancji — "czy to da się zrobić bez callbacków?" czasem daje zaskakująco dobre rozwiązania

## 5. Automatyczne naprawianie zamiast zarządzania

- Zamiast "przeanalizuj ten błąd" — wklej error log i powiedz "fix"
- Claude lepiej działa gdy ma jasny cel i autonomię
- Nie zarządzaj każdym krokiem — ustaw kierunek i pozwól działać
- Jeśli potrzebujesz więcej mocy — powiedz "use subagents" dla złożonych problemów
