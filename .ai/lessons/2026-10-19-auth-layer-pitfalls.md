---
date: 2026-10-19
topic: pułapki przy warstwie auth, API i CRUD (wdrożenie standardów inżynierskich)
status: active
---

# Pułapki wykryte przy wdrażaniu auth, `makeCrudRoute`, `CrudForm` i `DataTable`

## Kontekst
Wdrożenie reszty `engineering-standards.md` (sesje, CSRF, rate limiting, zdarzenia, warstwa UI). Każdy z poniższych błędów
wykrył test, a nie czytanie kodu.

## Czego się nauczyliśmy
- **`loadEnvConfig` z korzenia repo bez `forceReload` nic nie robi** — Next ładuje wcześniej własne pliki z `packages/app` i zwraca
  cache. Zmienne z `.env.local` w korzeniu nie docierały do aplikacji, choć dokumentacja twierdziła inaczej. Weryfikuj ładowanie
  konfiguracji testem z realnym plikiem, nie założeniem.
- **CSRF: porównuj `Origin` z nagłówkiem `Host` (lub `x-forwarded-host`), nie z `request.url`.** W trasie Next `request.url`
  zawierał `localhost`, a przeglądarka wołała `127.0.0.1`, więc prawdziwe żądania były odrzucane; za proxy bywa wewnętrzna nazwa hosta.
- **Konfiguracja musi zawieść przed mutacją.** Brak `JWT_SECRET` wykrywany dopiero przy wystawianiu cookie zostawiał utworzone konto
  i odpowiedź 500. Trasy auth wołają `getEnv()` na początku. Publiczne odczyty nie mogą jednak wymagać sekretu: odczyt środowiska
  tylko gdy żądanie niesie cookie.
- **`z.email()` nie przycina spacji.** Normalizacja (`trim`, `toLowerCase`) musi poprzedzać walidację (`.pipe(z.email())`).
  Domyślne komunikaty Zod są nieczytelne dla użytkownika — schematy współdzielone z formularzem dostają własne komunikaty.
- **Emiter zdarzeń: synchroniczny wyjątek w subskrybencie** wychodził poza `Promise.allSettled`, bo `handler(payload)` wołano
  przed zawinięciem w promise. Zawijaj przez `Promise.resolve().then(...)`.
- **Wejście izomorficzne pakietu nie może sięgać po moduły serwerowe** (bcrypt, jose, kontener, baza). Stała `PASSWORD_MAX_LENGTH`
  siedziała w pliku importującym `bcryptjs`, więc walidator trafiłby do bundla klienta. Pilnuje tego test śledzący importy `index.ts`.
- **Jest 29 i pakiety ESM-only (`jose`):** potrzebny `transformIgnorePatterns` z wyjątkiem dla pakietu (po `next/jest`, w funkcji async).
- **Granice pakietów łapią własne testy:** test `core` importujący `@mikro-orm` złamał regułę ESLint — ORM podmieniamy w teście przez mock `@devmentor/db`.
- Dane osobowe: serwisy zwracają DTO, nie encje; pole `hidden()` utrudnia typowanie, więc nie zastępuje DTO.
- Przeglądarka loguje oczekiwane 401 z `/api/auth/me` dla gościa jako błąd konsoli — test filtruje tylko ten jeden adres.

## Jak to stosować
Zmiany w auth, CSRF i cookie zawsze z testem E2E na buildzie produkcyjnym (`npm run test:e2e`) i testem regresji bezpieczeństwa.
