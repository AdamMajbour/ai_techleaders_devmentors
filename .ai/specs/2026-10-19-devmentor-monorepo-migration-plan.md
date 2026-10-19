---
date: 2026-10-19
title: DevMentor — plan migracji aplikacji do monorepo
status: in-progress  # fazy 1-6 zakończone; engineering-standards.md wdrożony (faza 5: struktura, faza 6: warstwy i bezpieczeństwo)
---

# Plan migracji do monorepo

## Cel

Przenieść działającą aplikację Next.js z katalogu głównego do `packages/app`, a kod współdzielony
rozdzielić na `packages/core`, `packages/db` i `packages/ui` zgodnie z AGENTS.md i README.md.
Dotychczasowe działanie aplikacji (strona startowa na porcie 3000) ma zostać zachowane.

Wyjściowy stan: aplikacja w `/src/app`, `/public`, `/next.config.ts`; pakiety w `packages/*` to
niekompilujące się szkielety (m.in. brak importu `React` w hookach, błędna nazwa pakietu `mikro-orm`,
brak zależności, `main` wskazujący na nieistniejący `dist/`, skrypty bez plików).

## Decyzje

- Pakiety `core`, `db`, `ui` są **wewnętrzne** (nie deployowane osobno): `main`/`types` wskazują na
  `src/`, a `app` transpiluje je przez `transpilePackages`. Nie ma osobnego kroku emisji do `dist/`.
- `npm run build` w `app` buduje aplikację razem z zależnościami z pozostałych pakietów.
- MikroORM **v6** (stabilna linia z dekoratorami); encje rejestrowane jako klasy, nie ścieżki plików.
- Konfiguracja ESLint (flat config) zostaje w katalogu głównym i obejmuje wszystkie pakiety.
- Tailwind CSS v4.

## Fazy

### Faza 1 — Workspace, przeniesienie aplikacji, kompilujące się pakiety

Zakres:
- [x] `git mv` aplikacji do `packages/app` (`src/app`, `public`, `next.config.ts`, `next-env.d.ts`)
- [x] `next.config.ts`: `transpilePackages` dla `@devmentor/{core,db,ui}`
- [x] Poprawne `package.json` pakietów (nazwy zależności, `main`/`types`/`exports`, skrypty)
- [x] Konfiguracje TypeScript: root jako baza, osobne `tsconfig.json` per pakiet, aliasy `@devmentor/*`
- [x] Naprawa kodu szkieletów `core`, `db`, `ui` tak, by przechodziły type-check
- [x] Aplikacja faktycznie korzysta z `@devmentor/core` (endpoint `/api/health`)
- [x] ESLint, Jest i skrypty root (`dev`, `build`, `start`, `lint`, `type-check`, `test`) działają
- [x] `.gitignore` obejmuje artefakty pakietów (`.next`, `dist`, `*.tsbuildinfo`)
- [x] `npm install` — jeden `package-lock.json`, workspace'y zlinkowane w `node_modules/@devmentor`

Kryteria ukończenia:
1. `npm run dev` z korzenia uruchamia aplikację; `GET /` zwraca 200 z tą samą treścią co przed migracją.
2. `npm run build` przechodzi (Next build + type-check pakietów).
3. `npm run type-check`, `npm run lint`, `npm test` przechodzą bez błędów.
4. W katalogu głównym nie zostaje kod aplikacji (`src/`, `public/`, `next.config.ts`).

### Faza 2 — Tailwind CSS i shadcn-ui (zakończona)

- [x] Tailwind v4 w `app` (PostCSS: `postcss.config.mjs`, `@tailwindcss/postcss`), `@source` na `packages/ui/src`
- [x] Style globalne i tokeny w `packages/ui/src/styles/index.css` (eksport `@devmentor/ui/styles`)
- [x] Komponenty `ui` w stylu shadcn-ui (cva + `cn` + Radix Slot): `Button`, `Card*`; `cn` w `ui/src/lib`
- [x] Użycie `Button`/`Card` w aplikacji — strona `/ui-preview`
- [x] Testy jednostkowe `cn` i `buttonVariants`

Kryteria: stylowane komponenty z `@devmentor/ui` renderują się w `app`; build i testy przechodzą.

### Faza 3 — Baza danych (MikroORM + PostgreSQL) (zakończona)

- [x] Konfiguracja CLI MikroORM, `.env.local` / `.env.example` (zmienne `DATABASE_*`)
- [x] Pierwsza migracja (`User`, `Article`) z `up` i `down`
- [x] Skrypt seed (`db:seed`)
- [x] Test integracyjny repozytoriów na lokalnym Postgresie (`npm run test:integration`)

Kryteria: `npm run migrate` i `npm run migrate:down` działają na czystej bazie.

### Faza 4 — Dependency Injection (Awilix) i testy komponentów (zakończona)

- [x] Kontener Awilix w `app` (`src/server/container.ts`), rejestracja repozytoriów z `db`, scope na żądanie
- [x] Użycie w aplikacji: `GET /api/users`, `GET /api/articles`
- [x] Testy komponentów i hooków `ui` / `core` (React Testing Library), test kontenera
- [x] E2E dla `app` (`npm run test:e2e`)
- [x] Weryfikacja całości (czysta instalacja, build, testy, uruchomienie)

Kryteria: testy komponentów i E2E przechodzą; pełna weryfikacja migracji zakończona sukcesem.

## Dziennik postępu

### Faza 1 — zakończona (2026-10-19)

Zrobione:
- `src/app`, `public`, `next.config.ts` przeniesione `git mv` do `packages/app` (historia zachowana);
  usunięty pusty `packages/app/src/index.ts` i alias `@devmentor/app`
- `transpilePackages` w `next.config.ts`; `main`/`types`/`exports` pakietów wskazują na `src/`
- Naprawione szkielety: brak importów `React` w hookach, JSX w pliku `.ts` (`ui/components` → `.tsx`),
  `useMediaQuery` przepisany na `useSyncExternalStore` (reguła `react-hooks/set-state-in-effect`),
  `mikro-orm` → `@mikro-orm/*` v6, usunięty `uuid` (`node:crypto`), `Opt<>` w encjach,
  `RequiredEntityData` zamiast `Partial` w repozytoriach, usunięty eksport nieistniejącego `./migrations`
- Hooki `core` wydzielone do `@devmentor/core/hooks` (root `core` zostaje wolny od Reacta/RSC)
- `packages/db/mikro-orm.config.ts` dla CLI; encje rejestrowane jako klasy
- `/api/health` w `app` używa `HTTP_STATUS` z `@devmentor/core` (realne użycie pakietu w aplikacji)
- Root: skrypty `dev/build/start/lint/type-check/test`, `eslint packages` (bez `--ext`), `jest.config.mjs`
  (next/jest), testy jednostkowe `core`; `.gitignore` o artefakty pakietów
- Usunięte: skrypty `seed`/`db:seed` (brak pliku) — wracają w fazie 3; `@typescript-eslint/*` z root
  devDependencies (nieużywane, `eslint-config-next` dostarcza własne)

Wyniki sprawdzeń: `npm run type-check`, `npm run lint`, `npm test` (4 testy), `NODE_ENV=production npm run build`
— bez błędów. Dev server: `GET /` → 200, treść strony identyczna jak przed migracją; `GET /api/health` → 200.
`npm run migrate` / `migrate:down` ładują konfigurację i łączą się z Postgresem (brak migracji do wykonania).

Uwagi:
- `next build` z `NODE_ENV=development` (ustawione w tym środowisku) kończy się błędem prerenderu
  `/_global-error` — buduj z `NODE_ENV=production`.
- Pierwsze `npm run migrate` utworzyło pustą bazę `devmentor` (MikroORM `ensureDatabase`) na lokalnym Postgresie.
- `npm audit` zgłasza podatności w zależnościach deweloperskich (jest/CLI) — do przeglądu osobno.

### Faza 2 — zakończona (2026-10-19)

Zrobione:
- `tailwindcss` + `@tailwindcss/postcss` (v4) w `app`; `globals.css` importuje tylko `tailwindcss/theme.css` i
  `tailwindcss/utilities.css` — **bez preflight**, żeby nie zmienić wyglądu istniejącej strony. Dotychczasowe style
  strony startowej owinięte w `@layer base`, dzięki czemu utility z komponentów `ui` mają pierwszeństwo.
- Paleta (`--background`, `--primary`, `--border`, `--radius`, …) przeniesiona z `globals.css` do `ui/styles` jako
  jedno źródło tokenów (te same wartości); `@theme inline` mapuje je na kolory Tailwinda.
- `Button` (warianty: default/secondary/outline/ghost/destructive/link, rozmiary sm/default/lg/icon, `asChild`)
  i `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`; stary `Button`/`Card` (kolory na sztywno,
  bez Tailwinda w app) zastąpiony. Root `@devmentor/ui` eksportuje też `cn`.
- `/ui-preview` renderuje komponenty z `@devmentor/ui`; strona `/` nie została zmieniona.

Wyniki sprawdzeń: `npm run type-check`, `npm run lint` (0 błędów, 0 ostrzeżeń), `npm test` (4 zestawy, 8 testów),
`NODE_ENV=production npm run build` (trasy `/`, `/ui-preview`, `/api/health`) — bez błędów. Dev: `GET /` i `GET /ui-preview` → 200.
Regresja wyglądu `/`: skompilowany CSS sprzed i po zmianie porównany regułami — 22 z 23 reguł identyczne co do znaku,
23. (`:root`) to przeniesiona paleta o tych samych wartościach (potwierdzone w CSS). Utility (`bg-primary`, `rounded-xl`, …)
obecne w CSS dev i prod; klasy komponentów obecne w HTML `/ui-preview`.

Ograniczenia weryfikacji:
- Brak przeglądarki w środowisku (Playwright Chromium nie startuje: brak `libnspr4`, instalacja wymaga roota),
  więc **nie oglądałem renderu** — tylko CSS/HTML i obliczone reguły. Warto zerknąć na `/ui-preview` i `/` okiem.
- Dodawanie komponentów przez CLI `shadcn` wymaga jeszcze `components.json` z aliasami pod `@devmentor/ui`
  (importy `@devmentor/ui/lib/utils` nie są dziś wyeksportowane) — nie robiłem tego spekulatywnie.

### Faza 3 — zakończona (2026-10-19)

Zrobione:
- `packages/db/src/migrations/Migration…_initial.ts`: tabele `user`, `article`, unikalny `email`, indeks `article.author_id`;
  `down()` dopisany ręcznie (przy snapshocie generator emitował tylko `up`; patrz „Domknięcie ograniczeń” — `snapshot: false`)
- Błąd w encjach znaleziony przy generowaniu schematu: `type: 'date'` dawało kolumny `date` (utrata godziny) —
  zmienione na `types.datetime` (`timestamptz`); dodany indeks na `authorId`
- Błąd w repozytoriach: globalny `getORM().em` jest w MikroORM v6 zabroniony (`ValidationError`) — repozytoria
  przyjmują teraz `EntityManager` w konstruktorze (`orm.em.fork()`), co pasuje do DI z fazy 4
- `.env.local` / `.env` z korzenia ładowane przez `src/env.ts` (dotenv; zmienne z powłoki wygrywają) dla CLI i seed;
  `src/load-env.ts` jako import z efektem ubocznym (kolejność importów ma znaczenie); `.env.example`
  (+ wyjątek w `.gitignore`)
- Świadomie `DATABASE_*`, nie `DATABASE_URL`: w tym środowisku `DATABASE_URL` wskazuje na bazę innego projektu
  (`open-mercato`) — czytanie go uruchomiłoby migracje i testy na cudzej bazie
- `scripts/seed.ts` (idempotentny), root `db:seed`; `ts-node` z override `module: commonjs` w `tsconfig`
- `initializeORM(overrides)` — nadpisania konfiguracji (np. dla testów)
- Jest: projekty `unit` (next/jest) i `db` (ts-jest, node); `npm test` = tylko unit, `test:integration` = baza, `test:all` = oba
- Test integracyjny (8 przypadków): migracje tworzą tabele, CRUD `UserRepository`, unikalność e-maila, zapis
  czasu w `timestamptz`, `ArticleRepository.findByAuthor`, `migrator.down()` usuwa tabele; używa osobnej bazy
  `devmentor_test` (wymuszona w `setup-env.ts`, dev baza nietknięta)
- README: Node 20.9+, zmienne środowiskowe, komendy, sekcje bazy i testów

Wyniki sprawdzeń:
- Na czystej bazie `devmentor`: `npm run migrate` → tabele `article`, `user`; `migrate:down` → zostaje tylko
  `mikro_orm_migrations`; ponowne `migrate` → OK; kolejne `migrate` → brak zmian
- `npm run db:seed` dwukrotnie → w bazie 2 użytkowników i 1 artykuł (idempotentne)
- `npm run test:integration` 8/8, `npm test` 8/8, `npm run type-check`, `npm run lint`,
  `NODE_ENV=production npm run build` — bez błędów; dev: `GET /` i `/api/health` → 200
- `.env.local` zweryfikowany na tymczasowym pliku (usunięty): wartości z pliku, nadpisanie z powłoki, domyślne bez pliku

Uwagi:
- Testy tworzą bazę `devmentor_test` (MikroORM `ensureDatabase`); baza `devmentor` zawiera migracje i dane z seed
- Jest nie ładuje plików migracji przez dynamiczny `import()` MikroORM — test rejestruje klasy migracji jawnie
  (`migrationsList`), czytając te same pliki co CLI
- `app` nadal nie importuje `@devmentor/db` — integracja z aplikacją przez DI w fazie 4 (po stronie serwera;
  prawdopodobnie `serverExternalPackages` dla `@mikro-orm/*` w `next.config.ts`)

### Faza 4 — zakończona (2026-10-19)

Zrobione:
- `packages/app/src/server/container.ts`: `buildContainer(orm)` (testowalny z fałszywym ORM) i `getContainer()` /
  `createRequestScope()`; `orm` jako singleton, `em` + repozytoria jako `scoped` (świeży `fork()` na żądanie); nieudana
  inicjalizacja ORM nie jest cache'owana (następne żądanie ponawia próbę)
- Trasy `GET /api/users?email=` (400/404/200) i `GET /api/articles?authorId=` (walidacja UUID) korzystające z kontenera
- `next.config.ts`: `serverExternalPackages` dla `@mikro-orm/*` i `pg`; `loadEnvConfig` ładuje `.env.local` z korzenia repo
  (Next czyta tylko pliki z katalogu pakietu); `experimentalDecorators`/`useDefineForClassFields: false` w `tsconfig` app
  (SWC/Turbopack kompiluje encje z `db`)
- Błąd wykryty dopiero przez E2E: w buildzie produkcyjnym minifikacja zmieniała nazwę klasy `User` na `u`, a MikroORM
  wyprowadza nazwę tabeli z nazwy klasy → `relation "u" does not exist` (dev działał). Naprawa: jawne
  `@Entity({ tableName: 'user' })` i `'article'` (migracje bez zmian)
- Błąd w konfiguracji Jest wykryty w czystej kopii: projekt `unit` łapał też `*.e2e.test.ts` (ignorował tylko `integration`);
  dodany wzorzec ignorowania; `NODE_ENV=test` wymuszone w `jest.config.mjs` (RTL nie działa z `NODE_ENV=production`)
- Testy: `Button` (render, klik, disabled, wariant + `className`, `asChild`), `Card*`, `useDebounce`, `useMediaQuery`
  (zmiana i sprzątanie listenera), `useAsync` (sukces, błąd, zmiana deps), kontener (zakresy, singleton ORM)
- E2E (7 przypadków, bez przeglądarki): build + `next start` na wolnym porcie, baza `devmentor_e2e` migrowana i zasilana
  skryptami npm, po testach `migrate:down`; strony `/` i `/ui-preview` (klasy Tailwind + reguła `.bg-primary` w CSS),
  `/api/health`, użytkownik i artykuł z seeda przez DI, walidacja parametrów, 10 równoległych żądań
- `.gitignore`: `.swc`; README: sekcje DI, testów i komend

## Weryfikacja końcowa migracji (2026-10-19)

Wykonana w **czystej kopii** repozytorium (bez `node_modules`, `.next`, `.git`) w `/tmp/verify`, a następnie w katalogu roboczym:
1. `npm ci` — przeszło (lockfile spójny), workspace'y zlinkowane (`node_modules/@devmentor/{app,core,db,ui}`)
2. `npm run type-check` — 0 błędów; `npm run lint` — 0 błędów i 0 ostrzeżeń
3. `NODE_ENV=production npm run build` — przeszło; trasy `/`, `/ui-preview`, `/api/health`, `/api/users`, `/api/articles`
4. `npm test` — 8 zestawów, 25 testów; `npm run test:integration` — 8/8; `npm run test:e2e` — 7/7
5. Uruchomienie: serwer dev (`npm run dev` z `openmercato.toml`) — `GET /` 200, `/ui-preview` 200, `/api/health` 200,
   `/api/users?email=ada@devmentor.local` 200 (dane z seeda, przez DI + MikroORM); produkcyjny `next start` obsłużony w E2E
6. `migrate` → `migrate:down` → `migrate` na czystej bazie (faza 3)

Ograniczenia i uwagi:
- **Render w przeglądarce nie został obejrzany** — Playwright Chromium nie startuje (brak `libnspr4`, instalacja wymaga roota).
  Wygląd `/` zweryfikowany porównaniem skompilowanego CSS (faza 2), `/ui-preview` — przez HTML i CSS. Warto otworzyć obie strony okiem.
- Testy integracyjne i E2E wymagają działającego PostgreSQL (lokalnie dostępny na `localhost:5432`, `postgres/postgres`) i tworzą bazy
  `devmentor_test` / `devmentor_e2e` (`ensureDatabase`); baza `devmentor` zawiera migrację i dane z seeda.
- `npm audit` zgłasza podatności w zależnościach (głównie narzędzia deweloperskie: jest, CLI) — nie były analizowane.
- Zmiany z faz 1–4 trafiły do PR #3 (PR #2 został zmergowany wcześniej i zawierał tylko szkielet pakietów).

## Domknięcie ograniczeń (2026-10-19, po weryfikacji końcowej)

- **Snapshot migracji wyłączony** (`snapshot: false`): plik `.snapshot-*.json` zapisywał się osobno dla każdej bazy (`devmentor_e2e`
  zostawiał nieśledzony plik), a wspólny plik po `migrate:down` w E2E spłaszczał się do pustego schematu. Bez snapshotu
  `migration:create` porównuje encje z bazą i generuje też `down()` (sprawdzone na tymczasowej kolumnie, zmiana cofnięta).

- **Next.js 16.3.4 → 16.4.2** (oraz `eslint-config-next`): `npm audit --omit=dev` pokazywał 1 krytyczną podatność w `next`
  (RCE w `next/og`); po aktualizacji 16 podatności w zależnościach produkcyjnych (6 umiarkowanych, 10 wysokich, 0 krytycznych —
  tranzytywne `braces`, `ajv`, `sprintf-js`, glob/`fast-glob` itd.). Poprawka z `audit fix --force` odrzucona (skoki major: MikroORM 7,
  Jest 30; dla `awilix` nawet obniżenie wersji). Po wymianie `node_modules` stary proces dev zwracał 500 — wymagał restartu.
- **Chromium bez roota:** biblioteki systemowe pobrane z `deb.debian.org` do `~/.cache/chromium-libs` (`scripts/setup-chromium-libs.py`,
  zweryfikowany od zera na pustym katalogu), `LD_LIBRARY_PATH` ustawiany przez test. `playwright` jako devDependency.
- **Render obejrzany** (zrzuty ekranu `/` i `/ui-preview`) — to ujawniło błędy, których CSS/HTML nie pokazywały:
  1. brak preflightu → przyciski miały natywną ramkę i szare tło (`ghost`, `link`), a `h3`/`p` w `Card` natywne marginesy;
     naprawa w bazowych klasach `Button` i `Card*`
  2. nieograniczona reguła `main { text-align: center; … }` ze strony startowej wyciekała na każdą stronę; zawężona do
     `.starter > main` (zrzut `/` pikselowo identyczny przed i po)
  Dodane testy przeglądarkowe w E2E (obliczone style obu stron, brak błędów konsoli, brak wycieku stylów).
- **PostgreSQL w CI i lokalnie:** `docker-compose.yml` (usługa `db`) i `.github/workflows/ci.yml` (usługa `postgres:17`, wszystkie
  sprawdzenia, w tym E2E z Chromium). Składnię obu plików sprawdzono parserem YAML; **nie uruchamiałem** ich (brak Dockera w
  środowisku, workflow nie był jeszcze wykonany na GitHub Actions).
- **shadcn:** `components.json` w `ui` i `app`, aliasy `@devmentor/ui/{components,lib,hooks}/*` w `exports` i `tsconfig`
  (sprawdzone: type-check + build Turbopack z importami podścieżek; `shadcn info` rozwiązuje wszystkie ścieżki; CLI tworzy plik w
  `src/components`). Znaleziony problem po stronie CLI/rejestru: wygenerowany import `from "cn"` także w czystym projekcie —
  opisane w README.

Weryfikacja po tych zmianach: `type-check`, `lint`, `npm test` (25), `test:integration` (8), `test:e2e` (9, w tym 2 w Chromium),
`NODE_ENV=production npm run build`, dev: `/`, `/ui-preview`, `/api/health`, `/api/users` → 200.

## Faza 5 — dostosowanie do `.ai/specs/engineering-standards.md` (2026-10-19)

Dokument (status: active) opisuje inny bootstrap (np. `admin/users`, `cradle.ts`, `withScope`), więc zastosowano jego **zasady**
do istniejącego kodu, a elementy bez konsumenta odłożono (YAGNI — sam dokument każe budować warstwy dopiero przy pierwszym użyciu).

Wdrożone:
- **Nazewnictwo i struktura konceptów:** `db/src/entities/<koncept>/<nazwa>.entity.ts` (`auth/user`, `articles/article`) przez
  `defineEntity` (jawne `name` i `tableName`, co zastępuje też obejście minifikacji), `base.entity.ts` (UUID + znaczniki czasu),
  `define.ts`; tabele snake_case w liczbie mnogiej — migracja `…_plural_table_names` (rename z zachowaniem danych, `down()` odwraca;
  `schema:update --dump` → „Schema is up-to-date”). `core/src/services/<koncept>/<nazwa>.service.ts`,
  `core/src/validators/<koncept>/<nazwa>.schema.ts` (Zod), `components/ui/` dla prymitywów shadcn, trasy w `api/<koncept>/`,
  grupa tras `(marketing)` i `HomePage`.
- **Kierunek zależności** `app → core → db`, `ui` samodzielny — wymuszony ESLintem (`no-restricted-imports`, sprawdzone próbnymi
  naruszeniami: `@mikro-orm` w app, `@devmentor/db` w app, `react` i `@devmentor/ui` w core, `@devmentor/core` w ui).
  Skutki: kontener DI przeniesiony z `app` do `core/src/container/` (`container.ts` + `cradle.ts`, rejestracja ręczna), serwisy w `core`
  używają repozytoriów z `db`, `app` nie zależy już od `db`/`awilix`/`@mikro-orm`; hooki React przeniesione z `core` do `ui`
  (`useAsync`), `ui` nie zależy od `core`; `db` re-eksportuje tylko typ `EntityManager`.
- **Wejścia pakietu core:** `@devmentor/core` (izomorficzne: typy, utils, stałe, błędy, walidatory) i `@devmentor/core/server`
  (kontener, serwisy, `apiHandler`, logger), żeby klient nie ciągnął bazy.
- **Warstwa API (server):** `http/errors.ts` (`AppError`, `ValidationError`, `Unauthorized/Forbidden/NotFound/ConflictError`),
  `http/apiHandler.ts` (koperta `{ ok, data | error }`, nieoczekiwany błąd → logowany, ogólny 500 bez szczegółów), `parseOrThrow`
  (Zod → `ValidationError` z `fieldErrors`, brak mass assignment), `logger.ts` (JSON, maskowanie haseł/tokenów/JWT/cookies).
  Trasy `/api/health` i `/api/articles` bez własnego `try/catch`.
- **Warstwa API (klient):** `ui/src/backend/api/apiCall.ts` (+ `apiCallOrThrow`, `readJsonSafe`, nagłówek klienta dla CSRF, wynik zamiast wyjątku).
- **Serwisy:** `UserService`, `ArticleService` (wymóg „encja ⇔ serwis”), testy jednostkowe z fałszywymi repozytoriami.
- Dokumentacja: sekcje „Domain concept convention” i „Reusable API & UI layer” w `AGENTS.md`, README, plik standardów dodany do repo.

Zmiana zachowania (świadoma): usunięto publiczne `GET /api/users?email=` — standard wymaga uwierzytelnienia tras niepublicznych,
a wyszukiwanie użytkownika po e-mailu bez logowania ujawnia dane i pozwala sprawdzać, kto ma konto. E2E potwierdza, że trasy już nie ma.
Dane demo mają stałe UUID (`packages/db/scripts/seed-data.ts`), więc E2E znajduje artykuł bez wyszukiwania użytkownika.
`/api/health` odpowiada teraz w kopercie (`{ ok: true, data: { status, timestamp } }`).

Odłożone w fazie 5 (wdrożone w fazie 6, patrz niżej; poza zakresem repo zostają dwie ostatnie pozycje):
- `makeCrudRoute.ts`, `auth.ts` (`requireSession`/`requireRole`/własność), JWT, cookies, CSRF po stronie serwera (klient już wysyła nagłówek),
  rate limiting, bcrypt — pierwszy koncept z logowaniem (`auth`); `config/env.ts` (Zod) — razem z pierwszym sekretem
- `CrudForm`, `DataTable`, `feedback/*` — pierwsza strona z listą/formularzem; `core/src/events` — pierwsza funkcja z efektami ubocznymi
- `docs/product-scope.md` i refaktor `/admin/users` z dokumentu — tych plików nie ma w tym repozytorium
- `pino` zamiast własnego loggera (20 linii, bez nowej zależności); `npm audit` jako bramka walidacji — raport jest w sekcji o ograniczeniach

Odstępstwa i pytania do właściciela:
- `Article` nie należy do konceptów z dokumentu (auth, mentors, availability, bookings, payments, messages, favorites, reviews) — zostaje jako
  przykład szkieletu (`articles`); do decyzji, czy usunąć przy pierwszym prawdziwym koncepcie.
- `Button` i `Card` są napisane ręcznie (standard: prymitywy tylko z `shadcn add`) — CLI 4.22.1 generuje błędny import `from "cn"`;
  alias `ui` w `components.json` wskazuje już `components/ui`, więc następne prymitywy trafią tam z CLI.
- Standard zakłada MikroORM z `defineEntity` — jest w 6.6.17, więc zostaliśmy przy v6 (migracja do v7 niepotrzebna).

Weryfikacja: `type-check`, `lint` (0 problemów), `npm test` (55 testów w 14 zestawach), `test:integration` (9), `test:e2e` (10, w tym 2 w Chromium),
`NODE_ENV=production npm run build`; strona główna pikselowo identyczna jak przed refaktorem.

## Faza 6 — reszta `engineering-standards.md`: warstwa API/UI, auth i bezpieczeństwo (2026-10-19)

Na wyraźną prośbę wdrożono także elementy odłożone w fazie 5, z wzorcami referencyjnymi na zasobie `articles` i stronach auth.

Wdrożone (kod + testy):
- **`core/http`:** `makeCrudRoute` (Zod + metody serwisów → `GET/POST/PUT/DELETE`; mutacje zawsze: CSRF → sesja → walidacja → serwis),
  `auth.ts` (`requireSession`, `optionalSession`, `assertOwns` z odmową domyślną; `requireRole` pominięte — produkt nie ma RBAC),
  `readJsonBody`, `jsonResponse`, `TooManyRequestsError` (429 + `Retry-After`).
- **`core/security`:** bcrypt koszt 12 (+ weryfikacja wobec atrapy dla nieznanego konta), JWT HS256 24 h (`jose`, odrzuca `alg: none` i inny HMAC),
  cookie `httpOnly`/`SameSite=Lax`/`Secure` w produkcji, CSRF (nagłówek klienta + `Origin` vs `Host`), limiter prób w pamięci
  (logowanie: 5 niepowodzeń / 15 min na klienta+e-mail; rejestracja: 10 prób / h), `withFailureLimit`.
- **`core/config/env.ts`** (Zod, leniwie): `JWT_SECRET` ≥ 32 znaki; aplikacja buduje się i startuje bez niego, trasy auth zawodzą przed jakąkolwiek mutacją.
- **`core/events`:** typowany emiter in-process (`event-bus`, `event-map`, subskrybent logujący) w `Cradle`; serwisy emitują po mutacji.
- **Serwisy:** `AuthService` (rejestracja z mapowaniem naruszenia unikalności na ogólny konflikt, logowanie z jednym komunikatem błędu),
  `ArticleService` (lista stronicowana, CRUD, własność, autor z sesji), DTO zamiast encji; `UserService` zawężony do `getById`.
- **`db`:** kolumna `password_hash` (migracja z `down()`, `hidden()` w serializacji), `findPage`/`update`/`delete`, `isUniqueConstraintViolation`.
- **`ui/backend`:** `CrudForm`, `DataTable`, `feedback/*`; prymitywy `input`, `textarea`, `table` dodane CLI `shadcn` (+ poprawka importu
  `from "cn"`); `useAsync` zachowuje poprzednie dane w trakcie ponownego ładowania; reset koloru obramowań (brak preflightu).
- **`app`:** trasy `api/auth/{register,login,logout,me}`, `api/articles` i `api/articles/[id]` (`makeCrudRoute`), strony `(auth)/login`,
  `(auth)/register`, `(marketing)/articles` (`DataTable` + `CrudForm` + `apiCall`).
- **CI:** `npm run audit:prod` (próg critical — 0 krytycznych w zależnościach produkcyjnych).

Błędy znalezione testami i naprawione: `loadEnvConfig` bez `forceReload` był no-op (zmienne z `.env.local` w korzeniu nigdy nie trafiały do aplikacji —
wcześniejsze twierdzenie w dokumentacji było nieprawdziwe), CSRF odrzucał prawdziwe żądania (`request.url` vs `Host`), konto tworzone przed
niepowodzeniem wystawienia sesji, publiczny odczyt wymagał sekretu, `z.email()` bez przycinania, wyjątek synchroniczny w subskrybencie
zdarzeń, wyciek `bcryptjs` do wejścia izomorficznego (stała w złym pliku), nieczytelne komunikaty Zod.

Weryfikacja: `type-check`, `lint` (0 problemów), 143 testy jednostkowe/komponentowe, 13 integracyjnych, 31 E2E (API, bezpieczeństwo, Chromium: rejestracja → artykuł →
usunięcie → wylogowanie), build produkcyjny; zrzuty ekranu `/articles`, `/login` obejrzane (po poprawce obramowań i komunikatów).

Nie wdrożone:
- `docs/product-scope.md` i `/admin/users` z dokumentu — brak tych plików w repozytorium
- `pino` (zostaje własny logger z maskowaniem, 30 linii, bez nowej zależności); port/adapter płatności, transakcje rezerwacji, kontrola ceny po stronie
  serwera — dotyczą konceptów `payments`/`bookings`, których jeszcze nie ma (folder konceptu powstaje z pierwszym plikiem)
- limiter w pamięci procesu i brak refresh tokenów — znane ograniczenia MVP z dokumentu, opisane w kodzie
- wartości `x-forwarded-for` są wiarygodne tylko za zaufanym proxy

