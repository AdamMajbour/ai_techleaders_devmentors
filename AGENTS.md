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
├── app/              # Główna aplikacja Next.js + strony frontendowe
│   ├── app/         # App Router
│   ├── pages/       # Jeśli używamy API routes
│   └── public/      # Zasoby statyczne
├── core/            # Wielokrotnie używalny kod
│   ├── utils/       # Utilitki
│   ├── types/       # Typy TypeScript
│   ├── hooks/       # React hooks
│   └── constants/   # Stałe aplikacji
├── db/              # Warstwa danych
│   ├── entities/    # MikroORM entities (modele)
│   ├── migrations/  # Migracje bazodanowe
│   ├── repositories/ # Repozytoria
│   └── config/      # Konfiguracja MikroORM i połączeń
└── ui/              # Komponenty interfejsu wielokrotnego użytku
    ├── components/  # shadcn-ui komponenty + customowe
    ├── hooks/       # UI-specificzne hooks
    └── styles/      # Globalne style Tailwind
```

## Princypia architektoniczne

### 1. Izolacja pakietów
- Każdy pakiet ma swoją odpowiedzialność
- `app/` zawiera logikę Next.js i routing
- `core/` zawiera logikę biznesową, niezależną od frameworka
- `db/` zarządza wszystkim związanym z bazą danych
- `ui/` zawiera tylko komponenty i styling

### 2. Dependency Injection z Awilix
- Rejestruj serwisy w kontenerze DI
- Wstrzykuj zależności zamiast tworzyć je localnie
- Ułatwia testowanie i zmianę implementacji
- Unikaj sprzężeń między warstwami

### 3. MikroORM i baza danych
- Definiuj modele w `packages/db/entities/`
- Migracje automatyczne w `packages/db/migrations/`
- Pulę połączeń zarządza MikroORM
- Repositories w `packages/db/repositories/` dla abstrakcji dostępu do danych

### 4. TypeScript everywhere
- Strikt mode: `"strict": true` w `tsconfig.json`
- Bez `any` — jeśli nie wiesz typ, zamiast tego napisz interface
- Wspólne typy w `packages/core/types/`
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
