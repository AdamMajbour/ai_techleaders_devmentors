# Audyt: wykrywacz generycznego wyglądu na aplikacji DevMentora

Data: 2026-10-28. Prompt: `lekcja-06/wykrywacz-aplikacja-devmentor.txt`. Żaden plik projektu nie został zmieniony.

## Zakres i ograniczenia

- **Sprawdzone:** kod `packages/app/src/app` i `packages/ui/src` (bez testów i stories w policzeniach), HTML pobrany z działającej aplikacji `http://localhost:3000` (trasy `/`, `/login`, `/register`, `/articles`, `/ui-preview`), tokeny i `contrast.json`.
- **Nie dało się zmierzyć: wszystko, co wymaga przeglądarki.** Chromium z Playwrighta nie uruchamia się w tym środowisku (brakuje bibliotek systemowych: `libnspr4`, `libnss3`, `libatk-1.0`, `libgbm` i innych). Dlatego nie mierzyłem kontrastu na ekranie, układu przy 1440, 768 i 320 px, fokusu klawiaturą ani rozmiarów elementów. Tam, gdzie liczby pochodzą z kodu albo z tokenów, jest to napisane.
- **Prompt jest nieaktualny w trzech miejscach:** pisze „Storybooka jeszcze nie ma” (jest, w `packages/ui/.storybook`), wskazuje `packages/ui/src/tokens.css` (plik jest w `packages/ui/src/styles/tokens.css`) i `http://localhost:3000/admin` (trasa nie istnieje, odpowiedź 404).
- **Co widać w aplikacji:** żywa aplikacja to w praktyce strona startowa szablonu Next.js plus cztery strony pomocnicze (`/login`, `/register`, `/articles`, `/ui-preview`) zbudowane na referencyjnym konceptie „articles”. Ekranów produktu (lista mentorów, rezerwacja, sesja) w aplikacji nie ma, istnieją tylko jako przykłady w Storybooku.

## Krok 1. Znaki generycznego wyglądu

Oznaczenia: **występuje** / **nie występuje** / **nie da się sprawdzić**.

### Kolor

| Znak | Wynik | Dowód |
|---|---|---|
| Indygo lub fiolet jako kolor akcji | nie występuje | Akcent to limonka (`--primary`). Fiolet `#BC9AFF` jest tylko w gradiencie favicona (`app/layout.tsx:9`) |
| Gradient w tekście nagłówka | nie występuje | brak `bg-clip-text` i `background-clip: text` |
| Gradient w tle albo na przycisku | **występuje (odpowiednik)** | tło strony startowej: `radial-gradient` jako maska i winieta (`app/globals.css:80`, `:81`, `:85`); favicon ma `linearGradient`. Na przyciskach nie ma |
| Ciemnogranatowe tło z poświatą | nie występuje | tło to ciepła szarość (`--background`), nie granat; nie ma cieni ani poświaty. Jest za to ciemniejąca winieta |

### Kształt i głębia

| Znak | Wynik | Dowód |
|---|---|---|
| Duże zaokrąglenia i pigułki | występuje tylko w martwym pliku | `border-radius: 128px` w `app/(marketing)/page.module.css:69`. Ten plik nie jest nigdzie importowany. W żywym kodzie największy promień to 8 px, a kropka statusu ma `50%` |
| Karty z cieniem jako jedyny separator | nie występuje | brak `shadow-`, `box-shadow`, `drop-shadow` |
| Karta w karcie | nie występuje | |
| Półprzezroczyste, rozmyte panele | nie występuje | brak `backdrop-blur` i `backdrop-filter` |

### Układ

| Znak | Wynik | Dowód |
|---|---|---|
| Pigułka z nowością albo liczbą nad nagłówkiem | **występuje (odpowiednik)** | chip „Running” z zieloną kropką nad `h1` (`app/(marketing)/page.tsx:12-15`, klasa `.status` w `globals.css`). Promień 6 px, ale to ten sam wzorzec |
| Wyróżnione kolorem słowo w nagłówku | nie występuje | |
| Para przycisków „Zacznij za darmo” / „Zobacz demo” | nie występuje na ekranie | ślad w martwym `page.module.css` (`.ctas`, `a.primary`, `a.secondary`), nieużywany |
| Rząd wielkich liczb | nie występuje | |
| Trzy identyczne karty z ikoną | nie występuje | jest za to rząd sześciu identycznych chipów („Next.js”, „React”, „TypeScript”, „App Router”, „Fast refresh”, „Port 3000”), bez ikon (`page.tsx:27-34`) |
| Karty unoszące się nad pierwszym ekranem | nie występuje | |

### Ozdobniki

| Znak | Wynik | Dowód |
|---|---|---|
| Logo jako kolorowy kwadrat z ikoną | **występuje** | favicon (`app/layout.tsx:9`): zaokrąglony kwadrat z gradientem limonka, żółty, fiolet i znakiem frameworka. Nie jest znakiem DevMentora |
| Awatary z inicjałami na kolorowym tle | nie występuje | komponent Avatar odrzucony w DS |
| Emoji zamiast ikon | nie występuje | brak w kodzie |
| Iskierki jako symbol AI | nie występuje | |
| Ikony na kolorowym tle przy nagłówkach | nie występuje | |
| Ozdobne tło (spoza listy) | **występuje** | `Backdrop`: canvas z kropkowanymi liniami i znakiem frameworka (`app/(marketing)/backdrop.tsx`, 249 linii), `aria-hidden`, czysto dekoracyjny |

### Tekst i dane

| Znak | Wynik | Dowód |
|---|---|---|
| Obietnice, które nic nie mówią o produkcie | **występuje** | „Your Next.js app is ready. Describe what you want in the AI Coding Agent tab, and this page turns into it.” (`page.tsx:16-22`); `<title>` „Next.js starter”, opis „Your Next.js app will show up here.” (`layout.tsx:7-8`) |
| Liczby, opinie, firmy spoza danych produktu | nie występuje w aplikacji | W Storybooku imiona mentorów są zmyślone, ale `sampleData.ts:1-3` mówi to wprost („invented for illustration”). Liczby są spójne z briefem: 25 EUR i 25 minut (D16), koniec pilotażu 14 grudnia (D18) |

## Krok 2. Błędy UX i dostępności

| Sprawdzenie | Wynik |
|---|---|
| Kontrast tekstu i elementów | **nie zmierzono w przeglądarce.** Obliczone z wartości tokenów (`contrast.json`, 22 pary, oba motywy): wszystkie pary wymuszone przechodzą. Najniższe: `destructive` na `card` w ciemnym 4,57 (próg 4,5) i `input` na `muted` w jasnym 3,06 (próg 3). Linie rozdzielające mają 1,31 i 1,27 (niewymuszane, dekoracyjne). Niezmierzone: tekst strony startowej nad canvasem tła (najgorszy punkt kropek pod tekstem) |
| Klikalne elementy poniżej 24 × 24 px | **przypuszczenie.** Przyciski mają co najmniej 32 px (`sm`) i 40 px, checkbox 24 px. Linki tekstowe `text-sm` (około 21 px wysokości) w `app/(marketing)/articles/articles-view.tsx:73-76` i na stronach logowania i rejestracji są pod progiem, ale odstęp 12 px między sąsiadami prawdopodobnie spełnia wyjątek z WCAG 2.5.8. Nie mierzone |
| Pola bez widocznej etykiety | nie występuje. `CrudForm` używa `Field`; HTML `/login` ma `<label for=…>` dla e-maila i hasła |
| Kolor jako jedyny nośnik stanu | nie występuje. Kropka „Running” ma słowo obok, linki są podkreślone |
| Brak stanów (ładowanie, pusto, błąd) | w liście artykułów są wszystkie trzy (`DataTable`), formularze mają stan wysyłania i błędy. **Luka:** błąd pobrania użytkownika i błąd usunięcia lub wylogowania nie mają stanu (patrz znalezisko 9) |
| Niewidoczny fokus | **nie da się sprawdzić bez przeglądarki.** Komponenty z `@devmentor/ui` mają pierścień z tokenów. Linki `text-primary underline` w aplikacji nie mają własnego stylu fokusu; CSS nie wyłącza `outline` (grep: brak), więc zostaje domyślny |
| Linie tekstu dłuższe niż 75 znaków | nie znaleziono w kodzie (komponenty tną do `65ch`; `.lede` ma `max-width: 30rem`, około 56 znaków). Nie zmierzono przy konkretnych szerokościach |
| Komunikaty błędów bez wskazówki | **występuje**, patrz znalezisko 10 |
| Treść znikająca bez JavaScriptu | **występuje**, patrz znalezisko 8 |

## Wynik 1. Najważniejsze znaleziska

| # | Znak lub błąd | Gdzie | Co widać | Dlaczego problem | Czym zastąpić | Pewność |
|---|---|---|---|---|---|---|
| 1 | Strona startowa szablonu zamiast produktu | `app/(marketing)/page.tsx`, `app/layout.tsx:7-8` | „Your Next.js app is ready…”, tytuł „Next.js starter”, znak frameworka | Generyczny wygląd: tekst, który nic nie mówi o produkcie, i obca marka | Pierwszy ekran z produktu (np. lista mentorów jak `MentorsListView` w E01) i tytuł z nazwą produktu | sprawdzone (HTML z serwera) |
| 2 | Pigułka statusu i rząd chipów | `page.tsx:12-15`, `:27-34`; `.status`, `.stack` w `globals.css` | „Running” z kropką nad nagłówkiem, pod spodem sześć chipów stosu technologicznego | Generyczny wygląd: chip nad nagłówkiem i rząd identycznych chipów. Stan środowiska nie jest treścią produktu | Usunąć | sprawdzone |
| 3 | Ozdobne tło | `app/(marketing)/backdrop.tsx`; `globals.css:80-85` | Canvas z kropkowanymi liniami, znak frameworka, maska i winieta z gradientów | Generyczny wygląd (gradient, ozdobnik); DS „What to avoid” odradza gradienty i efekty | Płaskie `--background`; usunąć tokeny `--vignette-edge`, `--mask-*` razem z `Backdrop` | sprawdzone w kodzie; wyglądu nie oglądałem |
| 4 | Favicon jako kolorowy kwadrat | `app/layout.tsx:9` | Zaokrąglony kwadrat z gradientem limonka, żółty, fiolet (`#BC9AFF`) i znakiem frameworka | Generyczny wygląd (logo-kwadrat, gradient, fiolet spoza palety). Cztery kolory hex (`#1B1B1B`, `#B4F372`, `#EEFB63`, `#BC9AFF`) są zakodowane jako `%23…`, więc `check:tokens` ich nie widzi | Płaski znak DevMentora w kolorach palety | sprawdzone (kod) |
| 5 | Martwy plik stylów | `app/(marketing)/page.module.css` | Pigułka 128 px, para przycisków primary i secondary, `h1` 40 px, odstępy 120 i 60 px, zmienne `--font-geist-*`, które nie istnieją. Brak importu w całym `app/src` | Dług: wprowadza do liczb i do wyszukiwania generyczne wzorce, których nikt nie używa | Usunąć plik | sprawdzone (grep) |
| 6 | Linki bez `TextLink` | `(auth)/login/login-view.tsx:23`, `(auth)/register/register-view.tsx:24`, `articles-view.tsx:73`, `:76` | `className="text-primary underline"` | Dostępność: brak stylu fokusu z tokenów. Limonka jako kolor tekstu ma w jasnym motywie 1,11:1 (komentarz w `tokens.css`, strona Color). Dziś ukryte, bo aplikacja nie ma przełącznika motywu (w `app/src` nie ma `data-theme`) | `TextLink` (token `--link`) | sprawdzone (kod); skutek w jasnym motywie nie oglądany |
| 7 | Formularz bez `method` | `packages/ui/src/backend/forms/CrudForm.tsx:134`; HTML `/login`: `<form noValidate="">` | Przed zakończeniem hydracji albo przy błędzie JavaScriptu Enter wysyła formularz domyślnym GET, czyli e-mail i hasło trafiają do adresu | UX i bezpieczeństwo: hasło w adresie, historii i logach | `method="post"` z `action`, albo formularz nieaktywny do hydracji; reguła w `CrudForm` | sprawdzone w HTML; skutek w przeglądarce to przypuszczenie |
| 8 | Treść znika bez JavaScriptu | `/articles` | Odpowiedź serwera zawiera tylko „Articles”, „Log in”, „Register”, „Loading…”. Lista jest ładowana po stronie klienta | UX: bez JS napis „Loading…” zostaje na zawsze | Dla krytycznych list: dane z serwera albo komunikat „enable JavaScript” | sprawdzone (curl) |
| 9 | Ciche błędy na liście artykułów | `articles-view.tsx:38-41`, `:49-57` | Błąd pobrania użytkownika udaje wylogowanego (pokazuje „Log in”). Wynik `DELETE` i `logout` jest ignorowany, więc nieudane usunięcie nie daje żadnej informacji | UX: brak stanu błędu przy akcji | `Alert` lub `ErrorMessage` z „Try again” | sprawdzone (kod) |
| 10 | Komunikaty błędów bez następnego kroku | `core/src/services/auth/auth.service.ts:12`, `core/src/http/errors.ts:52`, `csrf.ts:23`, `:28`, `apiCall.ts:61` | „Invalid credentials.”, „Too many attempts. Try again later.” (nagłówek `Retry-After` jest, tekst nie podaje czasu), „The server could not be reached.”, „Missing client header.”, „Cross-origin request rejected.” | UX: Content.mdx wymaga „co się stało i co zrobić”. „Invalid credentials” jest ogólne celowo (bezpieczeństwo), brakuje tylko dalszego kroku | Szablon z krokiem i czasem z `Retry-After` | sprawdzone (kod) |
| 11 | Strony aplikacji poza zasadami DS | `articles-view.tsx`, `ui-preview/page.tsx`, `login-view.tsx`, `register-view.tsx` | Surowe klasy skali Tailwinda: `p-8`, `gap-3`, `gap-4`, `gap-6`, `text-2xl`, `text-sm`, `font-semibold`, `max-w-md`, `max-w-2xl`, `max-w-3xl`; `Card` wokół tabeli | Generyczny wygląd: wartości domyślne biblioteki zamiast tokenów. `check:tokens` ich nie łapie, bo nie są arbitralne | Tokeny (`gap-between-groups`, `text-page-title`, `max-w-content`) i brak karty wokół listy | sprawdzone |
| 12 | Czcionka spoza tokenów | `app/globals.css:34` | `font-family: Inter, system-ui, sans-serif`; Inter nie jest nigdzie ładowany, a token `--family-sans` to stos systemowy | Generyczny wygląd: wygląd zależy od tego, czy Inter jest zainstalowany | `font-family: var(--family-sans)` | sprawdzone (kod); wyglądu nie oglądałem |

## Wynik 2. Pozostałe znaleziska

- Trasa `/ui-preview` jest publiczną stroną aplikacji z wariantami przycisku (narzędzie, nie produkt).
- `text-center` występuje w `EmptyState`, `ErrorMessage`, `LoadingMessage` i na etykiecie przycisku. To pojedynczy komunikat, DS to dopuszcza („What to avoid”).
- `app/globals.css` definiuje własne `--mono`, które powtarza `--family-code`.
- Tytuły stron: `/login`, `/register`, `/articles` i `/ui-preview` mają własne, tylko strona główna zostaje z „Next.js starter” (sprawdzone w HTML z serwera).
- DS ma po stronie Storybooka własne dane przykładowe z wymyślonymi imionami. Są oznaczone jako przykład i nie trafiają do aplikacji.

## Wynik 3. Liczby (rozrzut wartości)

Liczby z kodu liczone skryptem na plikach `*.tsx` i `*.css` w zakresie: `APP` = `packages/app/src/app` bez `api/`; `UI` = `packages/ui/src` bez testów, stories, wzorców, ekranów i `tokens.css`. „Żywe” znaczy bez martwego `page.module.css`.

| Miara | Wynik | Skąd |
|---|---|---|
| Kolory tekstu widoczne na ekranie przy 1440 px | **nie zmierzono w przeglądarce.** Dla `/` z CSS: 2 (`--headline` i `--soft`) | policzone z kodu, nie z ekranu |
| Kolory tekstu w kodzie | UI: 12 klas z tokenów. APP: 1 dodatkowa (`text-primary`) | kod |
| Rozmiary fontu widoczne na ekranie przy 1440 px | **nie zmierzono.** Dla `/` z CSS: 6 (41,6; 17; 14; 13; 12,25; 12 px) | policzone z CSS, `h1` wynika z `clamp(…)` przy 1440 px |
| Rozmiary fontu w kodzie | UI: 5 ról (`body`, `code`, `label`, `meta`, `section-title`). APP żywy: 6 wartości w CSS plus `text-2xl` i `text-sm`. Martwy plik: 5 wartości | kod |
| Promienie zaokrąglenia w kodzie | UI: 3 (`rounded-sm`, `-md`, `-lg` = 4, 6, 8 px). APP żywy: 3 (4 px, 6 px, 50%). Martwy plik: 2 (128 px, 6 px). Razem unikalnych: 5 (4, 6, 8, 128 px i 50%) | kod |
| Wartości odstępów (padding, margin, gap) | UI: 7 wartości niezerowych (2, 4, 8, 12, 16, 24, 32 px), **1 poza siatką 4 px** (2 px). APP żywy: 12 (4,8; 7,2; 8; 9,6; 10,4; 12; 16; 20; 24; 28; 32; 76 px), **4 poza siatką** (4,8; 7,2; 9,6; 10,4 px, wszystkie z `.status` i `.stack` w `globals.css`). Dodatkowo 3 wartości względne w `em`. Martwy plik dokłada 48, 60 i 120 px. Razem żywych unikalnych: 14, poza siatką 5 | kod |
| Kolory wpisane na sztywno poza plikiem tokenów | **0** według `check:tokens` dla całego `packages/ui` oraz dla `packages/app/src/app` (kopia skryptu na tym katalogu; skrypt projektu go nie obejmuje). **Plus 4 w faviconie** (`%23`-kodowane hex: `#1B1B1B`, `#B4F372`, `#EEFB63`, `#BC9AFF`), których skrypt nie widzi | skrypt i grep |

## Wynik 4. Pięć decyzji, żeby interfejs przestał wyglądać jak średnia

To opis w raporcie, nie zmiana w plikach.

1. **Pierwszy ekran i treść pochodzą z produktu, nie z szablonu.** Strona główna to lista mentorów albo logowanie linkiem; znika `Backdrop`, `.status`, `.stack`, martwy `page.module.css`, tekst „Your Next.js app is ready”. Forma: **zasada** (co jest pierwszym ekranem) z usunięciem kodu.
2. **Jeden płaski znak DevMentora, bez gradientu i bez fioletu.** Favicon, logo i tło bez maski i winiety. Forma: **token** (kolory znaku z palety, usunięcie `--vignette-edge` i `--mask-*`) oraz **zasada** „znak i tło są płaskie”.
3. **Jedna strona = jeden szkielet i jeden link.** Szkielet strony (`main`, `h1`, `max-w-content`, odstępy) jako wspólny element i wszystkie linki przez `TextLink`, bez surowych `p-8`, `gap-6`, `text-2xl`. Forma: **komponent** (`Page`) oraz **zasada** (skan `check:tokens` obejmuje też `packages/app`).
4. **Jedna czcionka z tokenu.** `font-family: var(--family-sans)` we wszystkich miejscach; usunąć `Inter`, `--font-geist-*` i duplikat `--mono`. Forma: **token** (użycie istniejących `--family-sans` i `--family-code`).
5. **Każda akcja ma wynik i krok dalej.** Błąd pobrania lub akcji zawsze pokazuje komunikat „co się stało + co zrobić” (z czasem z `Retry-After`), a formularz nie wysyła GET z hasłem przed hydracją. Forma: **zasada** (Content.mdx i `CrudForm`) oraz **komponent** (zachowanie `CrudForm` i `ErrorMessage`).
