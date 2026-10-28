# Raport: kolejne rundy testu agentem na design systemie (ekran „My sessions”), rundy 2 do 4

Data: 2026-10-28. Pierwsza runda i jej pokrycie: `lekcja-06/raport-luk-test-agentem.md`. Tu są rundy 2, 3 i 4. Każda runda to świeży agent bez wiedzy z rozmowy, ten sam prompt co w rundzie 1 (treść z polecenia testu), inny katalog wyniku i zakaz czytania wcześniejszych wyników. Wyniki: `lekcja-06/nowy_ekran_2/`, `nowy_ekran_3/` i `nowy_ekran_4/` (rundy 2, 3 i 4).

## Liczby

| Kategoria | Runda 1 | Runda 2 | Runda 3 | Runda 4 |
|---|---|---|---|---|
| REGUŁA | 24 | 28 | 39 | 44 |
| PRZYKŁAD | 13 | 8 | 9 | 10 |
| ZGADUJĘ | 15 | 11 | 4 | 6 |
| Razem | 52 | 47 | 52 | 60 |

Zero „ZGADUJĘ” nie zostało osiągnięte w żadnej z tych rund, a liczba nie maleje monotonicznie (runda 4: 6 po 4 w rundzie 3). Agent dzieli ekran na coraz drobniejsze decyzje (47, 52, 60), a część nowych luk wprowadziły same nowe zasady (patrz niżej). Liczby podaję tak, jak policzył je agent. Sprawdziłem, że znaczniki w tabeli rundy 2 sumują się do 28, 8 i 11.

## Weryfikacja wyników przez prowadzącego

Dla rund 2, 3 i 4: `tsc` przechodzi, kopia `check-tokens.mjs` uruchomiona na katalogu wyniku daje 0 trafień, wszystkie stories renderują się w jsdom bez naruszeń dostępności (kontrast niemierzony), a funkcje `play` agenta (rundy 3 i 4) przechodzą. Zakazane pliki nie były czytane: wzmianki o nich w transkrypcie to prompt, standardowy tekst systemowy i migawka `git status`. Nic nie oglądano w przeglądarce (Chromium nie startuje w sandboxie).

## Runda 2

Pozostałe „ZGADUJĘ” (11), z odpowiedzią właściciela albo zapisaną zasadą:

| Co agent zgadywał | Rozstrzygnięcie |
|---|---|
| Układ elementów wiersza sesji | zasada (układ lewej i prawej kolumny, kolejność) w `What is missing` |
| Skąd cena: rezerwacji czy mentora | decyzja właściciela: cena rezerwacji (`priceMinor`, `currency`); spec rezerwacji zaktualizowany |
| Strefa czasowa i styl daty | decyzja: `timeZone` z profilu seekera; styl w `Content`. Spec nie ma profilu seekera, więc pole trzeba dopisać |
| Filtr po stronie klienta czy serwera | decyzja: po stronie klienta; `GET /api/bookings?role=seeker` zwraca całą listę |
| Parametr `page` i lista powyżej 25 wierszy | zasada: lista rosnąca ponad 25 wierszy potrzebuje najpierw paginacji |
| Opakowanie wiersza szkieletu | zasada w `List with filters` §5 |
| `Alert` przy nieudanym odświeżeniu: wariant, miejsce, przycisk | zasada: `destructive`, nad listą, przycisk jako dziecko `Alert` |
| Długi tekst | tabela „Long text” w `Content` |
| Fokus po usunięciu filtra | zasada: fokus wraca na `Select`; story wzorca to robi |
| Typ elementu listy i mapowanie `refundStatus` | decyzja: cztery wartości, takie jak `RefundState`; spec poprawiony (był niespójny w sobie: wiersz 137 vs 169) |
| Stan „many items” bez paginacji | zasada progu 25 wierszy |

Sprzeczności w dokumentacji znalezione w rundzie 2 i poprawione: szerokość filtra (tekst `max-w-session`, story `w-56`), link `BookingRow` z „booking” w interfejsie (teraz „session” dla seekera, „question” dla mentora, z testem), brak przykładu kodu dla listy `ul` (dodany).

## Runda 3

„ZGADUJĘ” (4) i ich pokrycie:

| Co agent zgadywał | Rozstrzygnięcie |
|---|---|
| Odstępy w regionie ładowania listy `ul` | zasada: bez `gap`, komunikat, potem trzy wiersze szkieletu |
| Szerokość przycisku w `Alert` | `className="w-fit"`, bo `Alert` układa dzieci w kolumnie |
| Funkcje `play` w story ekranu | `Contributing`: opcjonalne, wskazane przy zachowaniu, które może się zepsuć |
| Jak strona ładuje listę (`apiCall`, `useAsync`) | przykład kodu w `List with filters` §10, oparty na `articles-view.tsx` |

Pozostałe luki z raportu agenta i ich zapis: retry w toku, wygasła sesja (401), licznik należy do paska filtrów, status wielowyrazowy w cudzysłowie, styl ceny i imienia w wierszu, tytuły story, źródło danych przykładowych, brak narzędzia do sprawdzenia ekranu poza `src` (wpis w „What is missing”). Sprzeczności poprawione: wiersz o dacie sesji w „What is missing” przeczył decyzji, `BookingsView` miał dwa bloki szkieletu zamiast trzech, story wzorca pokazywało licznik nad pustym stanem, ścieżka komponentów w `AGENTS.md` była błędna, a zdanie o języku interfejsu zostało wyodrębnione do własnego wiersza (agent go nie znalazł w długim akapicie).

## Decyzje właściciela z tych rund

Cena rezerwacji, filtr po stronie klienta, strefa z profilu seekera, cztery wartości `refundStatus`, rekomendacje z listy otwartych decyzji (filtr widoczny tylko przy niepustej liście, kolejność od najnowszych, trasa `/bookings` z etykietą „My sessions”, karta mentora i `startsAt` w `GET /api/bookings`) oraz wszystkie propozycje z rund 2 i 3 (zatwierdzone 2026-10-28). Nadal otwarte: skąd pochodzi pierwsza wartość `timeZone` seekera, lista mentorów jako `Table` (R01.3) i pozostałe pozycje „Open decisions”, które nie dotyczą tego testu.

## Runda 4

„ZGADUJĘ” (6) i ich zapis:

| Co agent zgadywał | Rozstrzygnięcie |
|---|---|
| Kolejność filtr, licznik, chipy (anatomia podawała inną niż story i ekrany) | jedna kolejność: filtry, chipy, licznik; anatomia w `List with filters` §4 poprawiona |
| Cudzysłów wokół statusu (reguła mówiła „wielowyrazowy”, przykłady cytowały też `"Accepted"`) | zawsze w cudzysłowie, jedno- i wielowyrazowy; chip bez cudzysłowu. Sprzeczność wprowadziła zasada z rundy 3 |
| Mentor bez technologii | linia znika, nic jej nie zastępuje (`MentorRow` i wiersz sesji) |
| Czy `ul` ma `aria-label` | nie, gdy nazywa go `h1` strony i to jedyna lista (`List with filters` §7) |
| Cena przy `payment_failed` i `pending_payment` | cena rezerwacji jest pokazywana dla każdego statusu; czy pobrano pieniądze, mówi status i linia zwrotu |
| Dane przykładowe: `BOOKINGS` nie pasuje do wiersza (kontrahenci to seekerzy, brak karty mentora i `startsAt`) | wpis w „What is missing”: komponent wiersza przynosi własne dane przykładowe |

Pozostałe luki: dwa linki o tej samej nazwie (dwie sesje z jednym mentorem; propozycja: nazwa dopisuje datę albo status), `MentorRow` bez `break-words` wbrew regule o długim tekście (poprawione w komponencie), `BookingsView` seekera nadal na `BookingRow` (wpis), narzędzie do sprawdzenia ekranu poza `src` (wpis rozszerzony).

**Artefakt testu, nie luka w dokumentacji.** Agent w rundach 3 i 4 pisał, że `AGENTS.md` milczy o języku interfejsu i ma starą ścieżkę `packages/ui/components/`. Plik na dysku (i w commicie) ma obie poprawki. Agent nie otworzył `AGENTS.md` ani razu: korzystał z kopii `CLAUDE.md` wstrzykniętej na początku sesji, która nie widzi późniejszych zmian. Wniosek: test agentem sprawdza dokumentację z `packages/ui`, ale zmiany w `AGENTS.md` trzeba testować w nowej sesji. Wpis w „What is missing”.

Przyczyny, dla których zero „ZGADUJĘ” jest tu nieosiągalne tą metodą: każda runda dzieli ekran na drobniejsze decyzje, nowe zasady wprowadzają nowe niespójności, a największa klasa zgadnięć (kopiowanie wiersza, paska filtrów i szkieletu strony) zniknie dopiero po zbudowaniu tych komponentów, a nie po opisaniu obejść.
