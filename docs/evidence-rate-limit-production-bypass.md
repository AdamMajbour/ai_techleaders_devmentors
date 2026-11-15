# Karta dowodu: obejście limitu logowania w produkcji

```yaml
Karta dowodu:
  Wymaganie / hipoteza: >-
    RESTLER_DISABLE_RATE_LIMIT=true użyte do lokalnych prób nie może wyłączać
    limitu prób logowania, gdy aplikacja działa w produkcji.
  Zakres i ryzyko: >-
    packages/core/src/security/rate-limit.ts; obejście ochrony przed brute force
    mogło pozwolić na nieograniczone próby logowania po błędnym ustawieniu
    zmiennej środowiskowej.
  Baza i docelowy commit: >-
    Baza e97c2c9 (HEAD przed zmianą, z lokalną niezacommitowaną poprawką
    RESTler). Czerwony commit e05bc19. Zielony commit poprawki bb0e2e0.
  Środowisko, seed, konto i czas: >-
    Windows / PowerShell, Node.js z lokalnego środowiska projektu, Jest unit.
    Bez bazy, seedów i kont; test używa zegara deterministycznego zaczynającego
    się od 1000000 ms i przesuwa go o 300001 ms.
  Sprawdzenie (komenda / żądanie / scenariusz): >-
    npx jest --selectProjects unit --runTestsByPath
    packages/core/src/security/rate-limit.production.test.ts --runInBand
    Test ustawia NODE_ENV=production i RESTLER_DISABLE_RATE_LIMIT=true,
    rejestruje trzy porażki dla jednego klucza i sprawdza blokadę 429;
    po upływie cooldown sprawdza odblokowanie.
  Oczekiwane zachowanie: >-
    Trzy błędne próby blokują klucz na cooldown także wtedy, gdy zmienna
    RESTLER jest ustawiona w produkcji.
  Rzeczywisty wynik i miejsce dowodu: >-
    Czerwony e05bc19: 1 test niezaliczony, asercja toThrow(TooManyRequestsError)
    zawiodła, bo limiter nie rzucił błędu. Zielony bb0e2e0: 1 test zaliczony.
    Test: packages/core/src/security/rate-limit.production.test.ts.
    Wymagany job CI: production-rate-limit-regression w .github/workflows/ci.yml.
  Czego to sprawdzenie nie dowodzi: >-
    Nie testuje żądań HTTP, prawdziwego proxy, wielu instancji aplikacji ani
    współdzielonego magazynu limiterów. Limiter pozostaje procesowy. Nie dowodzi
    też, że status check jest aktywny w regule ochrony gałęzi.
  Decyzja i osoba odpowiedzialna: >-
    Obejście dozwolone wyłącznie poza NODE_ENV=production; odpowiedzialni za
    politykę merge są administratorzy repozytorium. Próba sprawdzenia ochrony
    gałęzi main przez GitHub API zwróciła HTTP 403: plan repozytorium nie
    obsługuje branch protection dla prywatnego repo. Po zmianie planu należy
    dodać production-rate-limit-regression do wymaganych checks.
```

## Wyniki uruchomień

- Na `e05bc19` (kod z obejściem): `FAIL`, 1 suite / 1 test; nie rzuca `TooManyRequestsError`.
- Na `bb0e2e0` (po poprawce): `PASS`, 1 suite / 1 test.
