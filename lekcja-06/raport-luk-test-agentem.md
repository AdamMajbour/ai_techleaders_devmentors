# Raport: test agentem na design systemie DevMentora

Data: 2026-10-28. Zadanie: zbudować ekran „My sessions” (lista sesji seekera z filtrem po statusie, stany: ładowanie, pusto, błąd, brak wyników filtra) wyłącznie z design systemu. Celem było sprawdzenie, czy design system wystarcza.

Ekran i jego przykład w Storybooku: `lekcja-06/nowy_ekran/MySessionsView.tsx` i `lekcja-06/nowy_ekran/MySessions.stories.tsx`.

Wniosek: design system wystarcza na stany, filtr i układ, ale nie na sam wiersz sesji. Nie ma w nim komponentu, który pokazuje jednocześnie mentora (imię, opis, technologie, cena) i status rezerwacji. Najwięcej zgadywania dotyczy wiersza i danych, a nie tokenów, odstępów czy stanów.

Uwaga: to raport z testu agentem, a nie wynik wykrywacza generycznego wyglądu (`wykrywacz-aplikacja-devmentor.txt`).

## 1. Luki

Numery wierszy odnoszą się do `lekcja-06/nowy_ekran/MySessionsView.tsx`.

### Brakujący komponent

| # | Luka | Co zgadłem i gdzie | Co dopisać |
|---|---|---|---|
| 1 | Wiersz sesji seekera: imię, opis, technologie, cena, status, link. `MentorRow` ma przycisk „Ask a question” i nie ma statusu. `BookingRow` nie ma technologii i nie przyjmuje dzieci. | Złożyłem `<li>` inline, kopiując markup `MentorRow` (`:133-150`). | Wariant `BookingRow` z blokiem mentora albo `MentorRow` z wymiennym przyciskiem. Dwa miejsca (lista mentorów i sesji) spełniają próg z Contributing. |
| 2 | Pasek filtrów (`Field` + `Select`, chip „remove filter”, „Clear all filters”, licznik) istnieje tylko jako przepis w `list-with-filters.stories.tsx`. | Skopiowałem go (`:85-120`). To drugi ekran, więc Contributing każe zrobić z niego komponent. | Komponent albo kanoniczny przepis w `ListWithFilters.mdx` z gotowym markupem. |
| 3 | Paginacja poza `DataTable`. | Pokazuję wszystkie wiersze (`:131`). | Samodzielny komponent paginacji albo zasada „lista `ul` nie ma stron”. |
| 4 | Szkielet strony (`main`, `h1`, `max-w-content`, `py-between-groups`) istnieje tylko jako niewyeksportowana funkcja `Page` w `e01-views.tsx`. | Powtórzyłem ją (`:53`). | Komponent albo zasada z gotowym fragmentem w `design-system.md`. |

### Brakujący stan

| # | Luka | Co zgadłem i gdzie | Co dopisać |
|---|---|---|---|
| 5 | Stany ładowania, pusty i błędu dla listy `ul`. Wbudowane są tylko w `DataTable`, a każdy ekran składa je ręcznie. | Złożyłem jak `BookingsView` (`:57-83`). Kształt i liczba szkieletów to zgadywanie (`:61-63`). | Przepis albo komponent stanów listy, z wzorem szkieletu wiersza. |
| 6 | Odświeżenie się nie udało, gdy lista jest już załadowana. `SessionThread` ma `refreshFailed`, lista nie. | Nie obsłużyłem. | Stan „stare dane + błąd odświeżenia”. |
| 7 | Błąd przy aktywnym filtrze. | Filtr znika, wartość zostaje w stanie. | Zasada: czy filtr zostaje i czy się zeruje. |
| 8 | Następny krok per status (`pending_payment`, `payment_failed`). `BookingRow` ma tylko `href`. | Jeden link „Open” dla wszystkich (`:145`). | Tabela „status → akcja seekera”. |
| 9 | Etap sesji (przed, w trakcie, po) i data. Status `accepted` obejmuje je wszystkie, więc filtr „po statusie” ich nie odróżnia. | Bez daty i godziny, filtr po 6 statusach rezerwacji. | Zasada pokazywania czasu w wierszu i definicja „statusu sesji”. |
| 10 | „Many items” bez paginacji. | Brak limitu. | Zasada z progiem (np. powyżej N wierszy strony). |

### Brakująca zasada (kiedy czego używać)

| # | Luka | Co zgadłem i gdzie | Co dopisać |
|---|---|---|---|
| 11 | `ul` czy `DataTable` dla listy z filtrami, gdy wiersz ma link i kilka atrybutów (R01.3 wisi u właściciela). | `ul` (`:131`). | Decyzja właściciela i jedno zdanie w `HowToChoose`. |
| 12 | Przejście do strony jako `Button asChild <a>` czy `TextLink`. `MentorRow` i przykłady E01 używają przycisku, a tabela „If… then” każe `TextLink`. | `TextLink` w wierszu, `Button` w pustym stanie (`:76`). | Zasada rozstrzygająca, bo tabela i przykłady się wykluczają. |
| 13 | Cena w wierszu `ul`: „25 EUR” czy „25.00 EUR”, z długością sesji czy bez. `Content.mdx` zna tylko „zdanie” i „tabelę”. | „25 EUR”, bez długości (`:144`). | Wiersz w tabeli formatów dla wierszy listy. |
| 14 | Szablony licznika i pustych stanów dla list innych niż mentorzy, oraz kolejność sortowania listy. | Własne teksty (`:114-124`), kolejność danych bez sortowania, statusy w kolejności cyklu życia (`:34`). | Szablony „N rzeczy z filtrem X” i domyślne sortowanie. |
| 15 | Szerokości poza tokenami: kontrolki, szkielety (`h-6`, `w-1/3`, `w-2/3`), `w-80` w storiesie. Nie są arbitralne, więc `check:tokens` ich nie łapie. | Skopiowałem z E01 i wzorca (`:61-63`). | Tokeny albo reguła rozmiarów szkieletu i szerokości pola filtra. |

### Niejasna albo sprzeczna dokumentacja

| # | Luka | Co zgadłem i gdzie | Co dopisać |
|---|---|---|---|
| 16 | Wzorzec List with filters mówi „lista = `DataTable`”, a `DataTable.mdx` zabrania go dla wierszy z linkiem. | Jak w luce 11. | Poprawić jedno z dwóch. |
| 17 | Filtr w stanach ładowania, błędu i pusto: wzorzec pokazuje go zawsze, E01 tylko w `ready`. Szerokość pola: `w-56` kontra `max-w-session`. | Jak E01 (`:85`, `:53`). | Jedna wersja. |
| 18 | Język UI. `AGENTS.md` jest po polsku i o języku UI milczy. Zasada „English” jest dopiero w `design-system.md` i `Content.mdx`. | Angielski. | Jedno zdanie w `AGENTS.md`. |
| 19 | Nazewnictwo. Lista seekera to „Your questions” (E01, Content), „my sessions” (`engineering-standards` S08, `(student)/sessions`) i `(student)/bookings` (spec rezerwacji). Padają też „seeker”, „mentee” i „student”. | Tytuł „My sessions” z zadania, teksty o „sessions” (`:55`, `:73`). | Glosariusz w `Content.mdx`. |
| 20 | „Karta mentora” z zadania i `MentorCardDto` ze specu kontra zakaz karty na wiersz (A01, R01.1). | Karta to kształt danych, nie `Card`. | Zdanie w `MentorRow.mdx`. |
| 21 | Pole „specjalizacja” nie istnieje. Jest `headline` („co mentor zrobił”), a A05 zabrania opisu tylko stanowiskiem. | `headline` jako specjalizacja (`:138`). | Nazwa pola w specu i w DS. |
| 22 | Dane: spec nie mówi, czy `BookingDto` niesie dane mentora. | Zakładam złączenie (`SessionItem.mentor`, `:21`). | Spec: `BookingDto.mentor: MentorCardDto`. |
| 23 | Przykładowy ekran poza `packages/ui` nie trafia do Storybooka: glob stories to `../src/**`, Tailwind `@source` to `../src` i `./`, a `ui.stories.spec.tsx` i katalog rejestruje się ręcznie. Contributing nie mówi, gdzie żyje ekran. | Nic nie zmieniałem (zakaz konfiguracji). Story istnieje, ale nie widać go w Storybooku. | Jedno miejsce na ekrany i opis rejestracji. |

## 2. Liczba decyzji

| Kategoria | Z listy z kroku 1 (44) | Dodane w trakcie budowy (8) | Razem (52) |
|---|---|---|---|
| REGUŁA | 23 | 1 | 24 |
| PRZYKŁAD | 8 | 5 | 13 |
| ZGADUJĘ | 13 | 2 | 15 |

Dodane w trakcie budowy:
- REGUŁA: długie teksty zawijają się, nie są ucinane.
- PRZYKŁAD: tytuł story, zestaw stories, dane z `sampleData`, `Button asChild` w pustym stanie, nazwy opcji filtra z `bookingStatusLabel`.
- ZGADUJĘ: kolejność statusów w filtrze i brak sortowania listy.

## 3. Wartości wpisane na sztywno

- **Skrypt projektu:** `check-tokens.mjs` skanuje tylko `packages/ui/src` i `.storybook`. Uruchomiłem jego kopię na `lekcja-06/nowy_ekran` i dał 0 trafień. Sondą potwierdziłem, że skanuje: `#fff`, `bg-zinc-900` i `p-[13px]` zostały złapane, potem sondę usunąłem.
- **Grep po liście z zadania** (hex, rgb, hsl, oklch, klasy palety, arbitralne wartości): 0 trafień.
- **Klasy ze skali Tailwinda, nie z tokenów:** `h-4`, `h-6`, `w-1/3`, `w-2/3`, `size-4`, `min-w-0`, oraz `w-80` tylko w storiesie (luka 15).

## Czego nie sprawdziłem

- **Przeglądarka:** nie widziałem ekranu w przeglądarce, tak jak całego design systemu (brak Chromium). Nie sprawdziłem kontrastu, układu przy 320, 768 i 1440 px ani obu motywów.
- **`tsc` i jsdom:** `tsc` przechodzi, a test jsdom przeszedł. Obejmował 8 stories z kontrolą dostępności (bez kontrastu) oraz filtrowanie, czyszczenie, puste i błędne stany. Pliki tymczasowe usunąłem.
- **Tailwind:** klasy ekranu są w całości używane też w `src`, więc sprawdziłem tylko pokrycie klas przez `@source`, a nie sam wygląd.
