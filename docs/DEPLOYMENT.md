# Wdrożenie DevMentor na Dokploy

Ten przewodnik opisuje pierwsze wdrożenie aplikacji oraz jej późniejsze aktualizacje. Wdrożenie korzysta z `docker-compose.yml` w katalogu głównym repozytorium. Compose buduje aplikację z `Dockerfile`, uruchamia PostgreSQL, czeka na gotowość bazy, wykonuje migracje i startuje serwer Next.js.

## Wymagania

- Dostęp do instancji Dokploy z możliwością tworzenia aplikacji.
- Repozytorium DevMentor dostępne dla Dokploy.
- Domena wskazująca na serwer Dokploy.
- UUID co najmniej jednego istniejącego konta operatora.
- Osobne, silne wartości dla hasła bazy i sekretu JWT.

## 1. Utwórz aplikację Compose

W Dokploy utwórz aplikację typu **Docker Compose**, wskaż repozytorium oraz gałąź, którą chcesz wdrażać. Jako plik Compose wybierz `docker-compose.yml`. Kontekst budowania to katalog główny repozytorium; nie zmieniaj go na `packages/app`.

## 2. Ustaw wymagane zmienne środowiskowe

Dodaj te zmienne w ustawieniach środowiska aplikacji Dokploy, zanim uruchomisz pierwszy deployment:

| Zmienna | Wartość |
|---|---|
| `DATABASE_PASSWORD` | Silne, unikalne hasło PostgreSQL. |
| `JWT_SECRET` | Losowy sekret o długości co najmniej 32 znaków. |
| `OPERATOR_USER_IDS` | UUID-y istniejących kont operatorów, rozdzielone przecinkami. |
| `APP_BASE_URL` | Publiczny adres aplikacji, np. `https://mentor.example.com`, bez końcowego ukośnika. |

Przykładowe wygenerowanie sekretu JWT na komputerze z OpenSSL:

```sh
openssl rand -base64 48
```

Compose wymaga jawnego ustawienia `DATABASE_PASSWORD`, `JWT_SECRET`, `OPERATOR_USER_IDS` i `APP_BASE_URL`; deployment przerwie się, jeśli którejkolwiek wartości brakuje. Nie zapisuj sekretów w repozytorium ani w commitach.

Domyślne wartości `DATABASE_NAME=devmentor` i `DATABASE_USER=postgres` mogą pozostać, jeśli nie masz powodu ich zmieniać. Zmień je tylko wtedy, gdy świadomie konfigurujesz inną nazwę bazy lub użytkownika.

Do lokalnego uruchomienia Dockera użyj wyłącznie developerskiego pliku z przykładowymi wartościami: `docker compose --env-file .env.compose.dev.example up --build`. Nie używaj go w Dokploy ani innym środowisku współdzielonym.

### Opcjonalne integracje

Ustaw poniższe zmienne tylko wtedy, gdy odpowiednia integracja została skonfigurowana:

- **E-mail przez Resend:** `MAILER_MODE=http`, `MAILER_API_KEY`, `MAIL_FROM`.
- **GitHub OAuth:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`; adresy demonstracyjne, jeśli są potrzebne: `DEMO_MENTEE_GITHUB_EMAIL`, `DEMO_MENTOR_GITHUB_EMAIL`, `DEMO_OPERATOR_GITHUB_EMAIL`.
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` oraz właściwe flagi `STRIPE_CONNECT_ENABLED` i `PAYMENTS_LIVE_ENABLED`.
- **Vault i AI:** odpowiednie flagi `VAULT_ENABLED`, `VAULT_PUBLISH_ENABLED`, `AI_LIVE_ENABLED` oraz `ANTHROPIC_API_KEY`, jeśli używasz integracji Anthropic.

Bez konfiguracji płatności i AI aplikacja pozostaje w ustawionych w Compose trybach mock/wyłączonych.

## 3. Skonfiguruj domenę i sieć

W konfiguracji domeny przypisz publiczną domenę do usługi `app` i portu kontenera `3000`, a następnie włącz HTTPS. Usługa `db` nie może być wystawiona publicznie.

Compose publikuje port PostgreSQL wyłącznie na `127.0.0.1` hosta (domyślnie `5432`) dla lokalnych narzędzi administracyjnych. Jeśli port jest już zajęty, ustaw `POSTGRES_HOST_PORT` na inny wolny port lub usuń mapowanie, jeśli nie potrzebujesz połączeń z hosta.

## 4. Uruchom pierwsze wdrożenie

Uruchom deployment z panelu Dokploy. Build korzysta z głównego `Dockerfile`. Compose:

1. uruchamia bazę PostgreSQL i czeka na jej healthcheck,
2. buduje obraz aplikacji,
3. wykonuje `npm run migrate`,
4. uruchamia aplikację przez `npm start`.

Kontener aplikacji ma healthcheck sprawdzający `/api/health`.

## 5. Sprawdź wdrożenie

Otwórz w przeglądarce:

```text
https://<twoja-domena>/api/health
```

Poprawna odpowiedź powinna zawierać `status: "ok"`. Sprawdź także, czy strona aplikacji ładuje się przez HTTPS. W razie problemów przejrzyj logi usług `app` i `db` w Dokploy. Błędy migracji będą widoczne w logach `app`, ponieważ migracje wykonują się przed startem serwera.

## Aktualizacja aplikacji

1. Upewnij się, że wdrażana gałąź zawiera zmiany, które chcesz opublikować.
2. Wykonaj kopię zapasową PostgreSQL przed wdrożeniem aktualizacji.
3. Uruchom redeploy w Dokploy dla tej samej aplikacji i sprawdź, czy wskazuje ten sam projekt Compose oraz wolumen bazy.
4. Po zakończeniu sprawdź `/api/health` i logi obu usług.

Migracje uruchamiają się automatycznie przy każdym starcie aplikacji. Przy zmianach schematu bazy sprawdź przed wdrożeniem, czy nowa migracja jest zgodna z posiadanymi danymi i czy istniejąca ścieżka migracji nie wymaga osobnych kroków.

## Dane i kopie zapasowe

PostgreSQL zapisuje dane w wolumenie Compose `devmentor-db`. Zwykły redeploy kontenerów zachowuje dane. **Nie usuwaj ani nie resetuj tego wolumenu** — jego usunięcie kasuje bazę.

Przed zmianą nazwy projektu Compose albo konfiguracji wolumenów sprawdź w Dokploy, który wolumen jest podpięty do usługi `db`. Zmiana nazwy projektu może spowodować utworzenie nowego wolumenu, przez co aplikacja wystartuje z pustą bazą. Wykonuj i przechowuj kopie zapasowe poza tym wolumenem oraz upewnij się, że można je odtworzyć.

## Przydatne ustawienia Compose

| Ustawienie | Domyślna wartość | Zastosowanie |
|---|---|---|
| `DATABASE_NAME` | `devmentor` | Nazwa bazy PostgreSQL. |
| `DATABASE_USER` | `postgres` | Użytkownik PostgreSQL. |
| `POSTGRES_HOST_PORT` | `5432` | Port PostgreSQL dostępny lokalnie na hoście, związany z `127.0.0.1`. |
| `PUBLIC_SIGNUP` | `false` | Włączenie lub wyłączenie publicznej rejestracji. |
| `MENTOR_PUBLISH_WINDOW_DAYS` | `14` | Okno publikacji profilu mentora. |
| `MENTOR_RESPONSE_WINDOW_MINUTES` | `120` | Okno odpowiedzi mentora. |
