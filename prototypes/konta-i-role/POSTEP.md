# Prototyp „Konta i role” — postęp

Stan: Etap 3 — notatki, dokumentacja, testy i sprawdzenie prototypu gotowe.

## Zakres i źródła

- Mapa ekranów: `lekcja-07/mapa-ekranow.md` — zachować identyfikatory `s01`–`s08`; aktywne są `s01` i `s04`–`s08`, a `s02`–`s03` pozostają poza zakresem.
- Brief: `.ai/specs/product-brief.md`.
- Brak specyfikacji kont i ról `2026-09-04-accounts-and-roles.md`. Mapa wskazuje jako najbliższe źródło `.ai/specs/2026-10-26-pilot-booking-flow.md` (E01, w tym E01-T01 / #10); nie traktować jej jako pełnej specyfikacji stron ról.
- Szary prototyp: `.ai/prototypes/discovery/mentor-onboarding/revision-001/README.md` i `index.html`. Wykorzystać wyłącznie kontekst zaproszenia/logowania i jawne reguły symulacji, nie kroki profilu mentora ani dostępności.
- Design system: `docs/design-system.md` oraz komponenty i tokeny `packages/ui`.
- Silnik przeglądu: `lekcja-07/silnik-przegladu/README.md`.

## Technologia i podgląd

- Samodzielne źródła prototypu w `prototypes/konta-i-role/`, z React 19 + TypeScript + Vite; korzystać z istniejącego `@devmentor/ui` i jego tokenów. Bez zmian w aplikacji, pakiecie UI ani jego konfiguracji.
- Wynik budowania zapisać do ignorowanego przez Git `packages/ui/.storybook/public/prototypes/konta-i-role/`. Sandbox Storybook serwuje `packages/ui/.storybook/public`; adres podglądu: `/prototypes/konta-i-role/index.html` na porcie 3000.
- Używać Storybooka z istniejącym `staticDirs: ['./public']` jako podglądu na porcie 3000; budowanie lokalne ma używać istniejącego Vite bez instalowania zależności.
- Pasek i silnik przeglądu pozostają osobnym narzędziem od nawigacji produktu. Kolory mostka oprzeć na tokenach semantycznych; nie dodawać własnych kolorów, odstępów ani komponentów.
- Przeglądarka skonfigurowana w `.ai/agentic.config.json`: `agent-browser`; sprawdzenie w przeglądarce zaplanowane na etap 3.

## Kolejność ekranów

1. Etap 1: szkielet oraz ścieżka powodzenia `s01` → `s04` → strona startowa wybranego konta (`s05`, `s06` albo `s07`); podłączyć komentarze, mapę ekranów, tryb prezentacji i „Back”.
2. Etap 2: dodać przełączanie stanów `s01`, `s04`–`s08`, bramki dostępu, konta demo i kontrolki scenariuszy. `s02` i `s03` pokazać wyłącznie jako zachowane identyfikatory poza zakresem, bez formularza ani przekierowania.
3. Etap 3: dodać notatki historii/symulacji/otwartych pytań, README i testy nawigacji; sprawdzić w przeglądarce 320/1440 px, oba motywy, klawiaturę oraz wszystkie przyciski i kontrolki.

## Kontrolki scenariuszy

- Odpowiedź na prośbę o link: wysłano dla zaproszonego i niezaproszonego (ten sam komunikat), limit prób, błąd wysyłki.
- Link: poprawny, wygasły, użyty ponownie, błąd weryfikacji.
- Sesja: aktywna lub wygasła; zachowanie bezpiecznego powrotu do dozwolonego adresu same-origin.
- Konto/rola: wylogowany, seeker, mentor, operator, seeker+mentor oraz konto bez wymaganej roli.
- Następne żądanie: błąd ładowania listy/strony roli; stany ładowania, gotowości i pustej listy.
- Pasek przeglądu: wybór ekranu, jasny/ciemny motyw i widoczna etykieta „Prototyp”.
- Brak kontrolki płatności — płatności nie należą do mapy kont i ról.

## Konta demo

| Osoba | E-mail fikcyjny | Rola |
|---|---|---|
| Maja Demo | `maja.mentee@demo.test` | seeker |
| Ada Kowalska | `ada.mentor@demo.test` | mentor |
| Ola Operator | `ola.operator@demo.test` | operator |
| Alex Demo | `alex.dual@demo.test` | seeker + mentor |

Brak haseł, prawdziwego wysyłania e-maili i zewnętrznego logowania. Stały czas demo z mapy: `2026-11-03T13:00:00Z`.

## Komponenty i luki design systemu

| Ekran | Komponenty do użycia |
|---|---|
| `s01` | `Page`, `Card`, `Field`, `Input`, `Button`, `Alert`, `TextLink` |
| `s02`–`s03` | Brak formularzy/ekranów produktowych; tylko oznaczenie poza zakresem |
| `s04` | `Page`, `LoadingMessage`, `ErrorMessage`, `TextLink` |
| `s05` | `Page`, `FilterBar`/`Select`, `MentorRow`, `EmptyState`, `ErrorMessage`, `LoadingMessage`, `Skeleton` |
| `s06` | `Page`, `BookingRow`, `BookingStatus`, `EmptyState`, `ErrorMessage`, `LoadingMessage`, `Skeleton`, `Button` |
| `s07` | `Page`, `Table` lub `DataTable`, `EmptyState`, `ErrorMessage`, `LoadingMessage`, `Skeleton`, `Button` |
| `s08` | `Page`, `Alert` lub `ErrorMessage`, `TextLink`, `Button` |

- Brak gotowej kompozycji strony operatora (`s07`) oraz odmowy dostępu (`s08`); złożyć je lokalnie z istniejących komponentów i tokenów, bez dodawania współdzielonych komponentów.
- Logowanie ma istniejący `LoginView`, ale jego kompozycja nie używa `Card`; mapa rozstrzyga użycie `Card`. Nie zmieniać `packages/ui`.
- Mapa wskazuje konflikt modelu ról z `AGENTS.md` (osobne uprawnienie operatora vs. brak RBAC). Prototyp może symulować zaakceptowane ścieżki mapy, ale nie rozstrzyga ani nie zmienia polityki produkcyjnej.
- Nie wymyślać rekordów rezerwacji/zatwierdzeń, ocen, liczb ani terminów; brak takich danych w dostępnych źródłach zgłosić, jeśli uniemożliwi pokazanie stanu gotowego.

## Etap 0 — sprawdzone

- Przejrzano mapę, brief, najbliższą specyfikację, dostępny szary prototyp, przewodnik DS, komponenty, silnik przeglądu oraz konfigurację sandboxa.
- Potwierdzono, że `packages/ui/.storybook/public/prototypes/` jest ignorowany przez Git.
- Nie zbudowano prototypu i nie zmieniono aplikacji ani design systemu.

## Etap 1 — szkielet i ścieżka powodzenia

- Źródła React/TypeScript korzystają z `@devmentor/ui`; Vite buduje do ignorowanego przez Git `packages/ui/.storybook/public/prototypes/konta-i-role/`.
- Ścieżka s01 → s04 → s05 działa: wysłanie linku jest wyraźnie oznaczone jako symulacja, a ważny link automatycznie kieruje do strony seeker. Nie ma hasła, wysyłki e-maila, prawdziwego tokenu ani zapisu konta.
- Dodano s06, s07 i s08 jako dostępne ekrany docelowe. Brak danych demo o rezerwacjach i zatwierdzeniach jest opisany wprost; nie dodano fikcyjnych rekordów.
- Ekrany s02 i s03 pozostają poza zakresem i nie są renderowane. ID pozostałych ekranów zachowano zgodnie z mapą.
- Silnik przeglądu działa na ekranach: nawigacja mapy, tryb komentarzy, panel komentarzy, Presentation, przycisk Back. ID prototypu w komentarzach: `konta-i-role`.
- Pasek przeglądu zawiera wybór aktywnych ekranów, przełącznik motywu oraz etykietę „Prototype”. Mostek silnika używa tokenów semantycznych UI.
- Sandbox Storybook nie działał początkowo na porcie 3000, dlatego uruchomiono go lokalnie na tym porcie. Adres prototypu zwrócił HTTP 200 i został otwarty w przeglądarce.
- Sprawdzone w przeglądarce: s01 → s04 → s05, bezpośrednia nawigacja do s06/s07/s08, powrót silnika Back, przełącznik motywu, przełączenie Comment/Clickable i otwarcie/zamknięcie panelu komentarzy.
- Walidacja: `vite build` zakończony powodzeniem; `tsc --noEmit` dla entry pointu zakończony powodzeniem. Wygenerowany wynik jest ignorowany przez Git.
- Etap 3 obejmuje sprawdzenie ekranów, motywów, responsywności, klawiatury i wszystkich kontrolek.

## Etap 2 — stany, role i scenariusze

- Dodano kontrolki konta demo, sesji, wyniku wysyłki linku, poprawności e-maila, wyniku linku i stanu danych strony. Wszystkie pozostają w pasku przeglądu, poza nawigacją produktu.
- Dodano cztery fikcyjne konta: Maja (seeker), Ada (mentor), Ola (operator) i Alex (seeker + mentor). Każde używa adresu `demo.test`; formularz nie zbiera haseł ani prawdziwych danych.
- Bramki do `s05`–`s07` wymagają aktywnej sesji i właściwej roli. Wylogowanie kieruje do `s01` z komunikatem; wygaśnięcie sesji pokazuje odrębny komunikat; brak roli kieruje do `s08`.
- Zachowano e-mail w formularzu przy błędzie walidacji i błędach wysyłki. Dla zaproszonego i niezaproszonego pokazuje się identyczny komunikat; link z symulacji konta niezaproszonego kończy się stanem wygasłym.
- Dodano stany linku: poprawny, wygasły, użyty i błąd weryfikacji. Ponowienie po błędzie linku przechodzi przez poprawny, lokalny scenariusz logowania; nie używa prawdziwego tokenu.
- Dla stron ról dostępne są stany ładowania, gotowości, pustych danych i błędu ładowania. Nie dodano fikcyjnych rekordów mentorów, rezerwacji ani zatwierdzeń; „ponów” czyści symulowany błąd.
- Sprawdzone w przeglądarce: niepoprawny e-mail; limity i błędy wysyłki; wspólny komunikat dla adresu niezaproszonego; poprawne logowanie `s01` → `s04` → `s05`; wygasły/użyty/błędny link i ponowienie; wszystkie cztery konta, poprawne i odrzucone role, sesje wylogowana/wygasła oraz stany danych ładowane/puste/błąd/ponowienie.
- Walidacja: `tsc --noEmit` oraz `vite build` zakończone powodzeniem; gotowy podgląd dostępny pod `/prototypes/konta-i-role/index.html`.
- Interakcje silnika komentarzy, motywy, przyciski, wymiary 320/1440 px i klawiaturę pozostawiono do sprawdzenia w etapie 3.
- Otwarte pytanie źródłowe pozostaje bez zmian: brak dedykowanej specyfikacji kont i ról; najbliższa specyfikacja pilot booking nie rozstrzyga pełnej polityki ról produkcyjnych.

## Etap 3 — uczciwość i sprawdzenie

- Dodano widoczną przy każdym aktywnym ekranie notatkę z historiami lub informacją o ich braku, symulowanym zachowaniem i nierozstrzygniętymi kwestiami.
- Dodano `README.md` z komendami podglądu/build/test, kontami demo, scenariuszami, ograniczeniami symulacji i lukami design systemu.
- Dodano testy Playwright w `test/navigation.spec.ts`: ścieżki logowania i powrotu do chronionego ekranu, nawigacja seeker/mentor/operator, bramka roli, przycisk Back, scenariusze formularza i linku, stany danych, przełączniki motywu/układu, komentarze (dodanie, odpowiedź, przeniesienie, rozwiązanie, ponowne otwarcie, usunięcie i eksport) oraz notatki ekranów.
- W przeglądarce sprawdzono 320 i 1440 px w obu motywach; szerokość dokumentu nie przekroczyła viewportu. Klawiaturą sprawdzono widoczny focus, przejście Tab do przycisku wysyłki i uruchomienie go Enterem; po nawigacji fokus trafia na nagłówek ekranu.
- Sprawdzono przyciski i kontrolki scenariuszy w testach; 5 testów Playwright zakończyło się powodzeniem. Type-check źródeł i testów, `vite build`, `git diff --check` oraz żądanie podglądu HTTP 200 również zakończyły się powodzeniem.
- Na `s08` przycisk review-engine „Back” jest celowo wyłączony, aby uniknąć powrotu przez historię do trasy wymagającej innej roli. Ekran oferuje logowanie lub stronę startową konta; po przełączeniu na konto uprawnione do żądanej strony pokazuje link do bezpośredniej kontynuacji. Test nawigacji obejmuje zmianę konta na bramce.
- Nie rozstrzygnięto braku osobnej specyfikacji kont i ról, konfliktu modelu operatora (`AGENTS.md` kontra specyfikacja pilota), zachowania produkcyjnego stron startowych ani założeń TTL/powrotu. Zob. źródła i ograniczenia wyżej oraz `README.md`; testy potwierdzają wyłącznie działanie symulacji.
- Wynik budowania pozostaje w ignorowanym katalogu Storybooka. Nie zmieniono aplikacji ani design systemu.
