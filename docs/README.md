# Dokumentacja DevMentor

Ten dokument zbiera informacje potrzebne do uruchomienia i rozwijania monorepo DevMentor. Krótki opis produktu znajduje się na stronie głównej [README](../README.md).

## Getting Started

### Wymagania

- Node.js i npm (wersje aktualnie używane przez zespół projektu).
- Dostęp do PostgreSQL.
- Zmienne środowiskowe wymagane przez aplikację; lokalne wartości trzymaj w `.env.local` i nie commituj sekretów.

### Uruchomienie aplikacji

1. Zainstaluj zależności z katalogu głównego:

   ```bash
   npm ci
   ```

2. Przygotuj PostgreSQL i skonfiguruj wymagane zmienne środowiskowe zgodnie z konfiguracją pakietów. Nie commituj sekretów.
3. Uruchom aplikację:

   ```bash
   npm run dev
   ```

4. Otwórz adres lokalny podany przez Next.js w terminalu.

Nazwy zmiennych zależą od usług, które chcesz uruchomić. Nie wklejaj prawdziwych kluczy ani haseł do plików śledzonych przez Git.

## Struktura repozytorium

| Ścieżka | Rola |
| --- | --- |
| `packages/app` | Aplikacja Next.js: widoki, routing i API. |
| `packages/db` | Schemat i integracja z bazą danych. |
| `packages/ui` | Wspólny system komponentów i Storybook. |
| `docs` | Dokumentacja projektu i obrazy README. |

## Główne obszary aplikacji

- **Osoby szukające pomocy:** przeglądanie mentorów, ich profili i dostępnych terminów.
- **Mentorzy:** edycja profilu i dostępności, obsługa rezerwacji, rozmów tekstowych oraz notatek.
- **Vault:** odpowiedzi tworzone na podstawie notatek mentorów, z widocznym źródłem.
- **Operatorzy:** zarządzanie zaproszeniami, akceptacjami, warunkami pilota i obsługą płatności.
- **Dostęp:** uwierzytelnianie i uprawnienia zależne od roli.

## Polecenia

Uruchamiaj skrypty dla aplikacji z katalogu głównego:

```bash
npm run dev
npm run lint
npm run type-check
npm run build
```

Repozytorium udostępnia też `npm run test:integration`, `npm run test:e2e` i `npm run test:all`. Wymagają konfiguracji środowiska testowego; sprawdź odpowiedni projekt Jest i jego instrukcje przed uruchomieniem.

## Zmienne środowiskowe

Aplikacja potrzebuje konfiguracji bazy danych, sekretu sesji oraz adresu bazowego. Integracje z logowaniem GitHub i płatnościami wymagają dodatkowych kluczy. Dokładny zestaw może się różnić między środowiskiem lokalnym i wdrożeniem; przykłady i nazwy źródeł prawdy znajdują się przy konfiguracji pakietów.

Trzymaj lokalne sekrety w ignorowanych plikach `.env.local`. Nie umieszczaj wartości produkcyjnych w dokumentacji, zgłoszeniach ani zrzutach ekranu.

## Zrzuty ekranowe

Obrazy w `docs/assets/` są dowodami z przebiegu prototypu onboardingu mentora, zapisanymi w `packages/ui/storybook-static/prototypes/szary/evidence/`. To lokalna symulacja zweryfikowanego przepływu onboardingowego; nie stanowi zrzutu aktualnej aplikacji produkcyjnej.
