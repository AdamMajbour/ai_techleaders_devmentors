# Mapa ekranów — konta i role (do zatwierdzenia)

**Zakres mapy po przyjęciu propozycji:** logowanie zaproszonych linkiem e-mailowym, weryfikacja linku, strony startowe mentee/mentora/operatora oraz odmowa dostępu. GitHub i osobna rejestracja są poza zakresem. Decyzje niżej są przyjęte na potrzeby tej mapy i prototypu; nie zmieniają jeszcze backlogu, briefu, AGENTS.md ani specyfikacji implementacyjnej.

## Źródła i historie

Nie ma pliku `.ai/specs/2026-09-04-accounts-and-roles.md` ani innej specyfikacji kont i ról. Najbliższym źródłem jest [specyfikacja przepływu rezerwacji z 2026-10-26](../.ai/specs/2026-10-26-pilot-booking-flow.md): opisuje E01-T01 (#10), logowanie linkiem magicznym, członkostwo z zaproszenia i część kontroli dostępu. Nie opisuje GitHuba, osobnej rejestracji, weryfikacji e-maila ani stron startowych ról. To wybór najbliższego dostępnego źródła, nie zamiennik brakującej specyfikacji.

[Backlog](../.ai/specs/backlog.md) zawiera:

| Historia | Tytuł w backlogu | Związek z mapą |
|---|---|---|
| E01, #7 | Seeker finds a mentor and books a paid 25-minute text session | Epik dotyczy szukania mentora i rezerwacji, nie kont i ról. |
| E01-T01, #10 | Decide the account and login method for the pilot | Jedyna historia o kontach/logowaniu. |
| E01-S01, #11 | A seeker finds a mentor through an invited-only list or a mentor's link | Kryterium dostępu do listy, nie reguły ról na stronach startowych. |
| E01-S02, #12 | A seeker writes a question, sees the price first and prepays | Nie jest historią logowania. |
| E01-S03, #13 | A mentor sees the question before accepting and a seeker is refunded on a no-show | Nie jest historią logowania. |
| E01-S04, #14 | A seeker and a mentor hold a 25-minute text session in the product | Nie jest historią logowania. |

W backlogu są tytuły historii, ale brak kryteriów akceptacji. Kryteria poniżej pochodzą z sekcji „Traceability” specyfikacji rezerwacji:

| ID kryterium | Treść / znaczenie | Zastosowanie |
|---|---|---|
| #10 AC | Istnieje decyzja D24, a brief nazywa metodę logowania (krok 1.1). D24 jest w specyfikacji proponowane; brief D12/D15 nadal mówi, że metoda logowania nie jest rozstrzygnięta. | Bezpośrednio do wejścia do konta, ale nie rozstrzyga GitHuba ani rejestracji. |
| #11 AC | Użytkownik spoza zaproszonych nie widzi mentorów; lista jest tylko dla zaproszonych (D19). | Ograniczony dostęp do listy. Nie definiuje, co widzi niezaproszony użytkownik na stronach startowych. |
| #12 AC | Cena przed wpisaniem pytania; płatność Stripe; zapis czasu/źródła; nieudana płatność nie tworzy widocznej rezerwacji; tylko 25 minut. | Poza zakresem ekranów kont. |
| #13 AC | Mentor widzi pytanie przed decyzją; seeker dostaje potwierdzenie; odmowa/wygaśnięcie skutkuje zwrotem; zwrot po no-show wymaga ścieżki operatora. | Poza ekranami kont; nie definiuje logowania operatora, jego strony startowej ani ogólnych reguł dostępu. |
| #14 AC | Wymiana tekstowa trwa 25 minut; osoba nieuczestnicząca nic nie widzi; po czasie sesja jest tylko do odczytu. | Nie definiuje ogólnej odmowy dostępu ani strony startowej roli. |

**Wniosek o numeracji:** #12–#14 mają inne znaczenie niż podane w opisie zadania; używam numerów z backlogu i nie przypisuję ich do logowania. Kryteria wymagające ekranów dla rejestracji, GitHuba i stron startowych nie występują w dostępnych materiałach.

Materiały badawcze: nie znaleziono `personas.md`. [Wywiad z developerem fintech](../.ai/specs/research/2026-09-01-interview-backend-dev-fintech.md) mówi wprost o niechęci do zakładania konta i czekania na weryfikację e-maila oraz o limicie 5 minut na booking; [brief](../.ai/specs/product-brief.md) podaje potrzebę znalezienia pomocy w 20 minut. To ryzyko dla przepływu, nie kryterium akceptacji. [Decyzja D12](../.ai/specs/research/decisions/D12-now-is-the-pilot.md) i [D15](../.ai/specs/research/decisions/D15-pilot-minimal-terms.md) mówią o zaproszonych uczestnikach i braku publicznej rejestracji w pilocie. [Zasady agentów](../AGENTS.md) i [przewodnik design systemu](../docs/design-system.md) są dodatkowymi źródłami.

## Przyjęte założenia przekrojowe

- E01-T01 / #10 jest źródłową historią dla kont i metody logowania. #12–#14 pozostają historiami płatności, decyzji mentora i sesji.
- W pilocie logowanie odbywa się linkiem magicznym dla zaproszonych; nie ma logowania GitHubem ani publicznej rejestracji. Pierwsze użycie ważnego linku przez zaproszoną osobę tworzy konto.
- „Mentee” z zadania oznacza w interfejsie „seeker”. Jedno konto może być seekerem i mentorem; uprawnienie operatora jest nadawane osobno, nie przez samodzielny wybór.
- Po zalogowaniu seeker trafia na listę mentorów, mentor na swoje rezerwacje, a operator na zatwierdzenia. To są miejsca docelowe, nie nowe dashboardy.
- Osoba bez sesji trafia do logowania. Zalogowana osoba bez wymaganej roli dostaje neutralny ekran braku dostępu; zasoby, których istnienie ma pozostać ukryte, nadal zwracają zachowanie 404. Po logowaniu wolno wrócić tylko do zachowanego adresu z tej samej witryny.
- Link jest jednorazowy i ważny 15 minut; po sukcesie następuje natychmiastowe przekierowanie, bez osobnego ekranu sukcesu. Po wygaśnięciu sesji ponowne logowanie wraca do bezpiecznego adresu docelowego, jeśli nadal jest dostępny.

## 1. Ekrany

W stanach oznaczenie **„brak AC”** jest celowe: pokazuje stan wymagany przez zakres zadania, którego nie można wywieść z historii lub kryterium w dostępnej specyfikacji. Nie należy traktować go jako zatwierdzonego zachowania produktu. „E-mail” w źródłach oznacza link magiczny, nie hasło.

| ID | ekran | rola | stany | historia lub kryterium | komponenty DS |
|---|---|---|---|---|---|
| s01 | Wejście / logowanie linkiem e-mailowym | Niezalogowany, zaproszony lub niezaproszony | **Domyślny:** pole e-mail i wysłanie linku. **Niepoprawny e-mail. Ładowanie. Wysłano:** ten sam neutralny komunikat niezależnie od zaproszenia. **Limit prób. Błąd wysyłki.** Nie ma GitHuba. | E01-T01 / #10; kontrakt `magic-link/request` zwraca taką samą odpowiedź, a dla niezaproszonego nie wysyła wiadomości. Storybook dokumentuje wysłanie, limit i błąd. | `Page`, `Card`, `Field`, `Input`, `Button`, `Alert`, `TextLink`. Przyjęto `Card` zgodnie z przewodnikiem DS; istniejący [LoginView](../packages/ui/src/screens/e01-views.tsx) wymaga późniejszego ujednolicenia. |
| s02 | Rejestracja e-mailem — poza zakresem | — | **Brak ekranu i stanów w prototypie.** ID zachowane, aby nie zmieniać identyfikatorów komentarzy; nie przekierowuje do rejestracji. | #10 AC nie wymaga osobnego formularza. Konto powstaje przy pierwszym użyciu ważnego linku przez zaproszoną osobę — decyzja L3. | Nie dotyczy. Nie dodawać komponentu formularza rejestracji. |
| s03 | Potwierdzenie rejestracji/weryfikacji — poza zakresem | — | **Brak osobnego ekranu.** Potwierdzenie wysłania linku jest stanem s01; osobna weryfikacja rejestracji nie występuje. ID zachowane. | E01-T01 / #10 i decyzja L3; obecny komunikat „Check your email” dotyczy linku logowania, nie publicznej rejestracji. | Nie dotyczy. Używać stanu s01, bez nowej kompozycji. |
| s04 | Weryfikacja linku magicznego | Niezalogowany, zaproszony | **Ładowanie:** sprawdzanie linku. **Sukces:** natychmiastowe przekierowanie do bezpiecznego adresu docelowego albo strony startowej roli. **Link wygasł/użyty. Błąd serwera.** | E01-T01 / #10; kontrakt `magic-link/consume` określa błędny, wygasły lub użyty link. Przyjęto TTL 15 minut i natychmiastowe przekierowanie — L8. Powrót do bezpiecznego adresu po wygaśnięciu sesji — L9. | `Page`, `LoadingMessage`, `ErrorMessage`, `TextLink`. Istniejące historie pokazują sprawdzanie i błędy; osobny stan sukcesu nie jest potrzebny przy natychmiastowym przekierowaniu. |
| s05 | Lista mentorów — strona startowa mentee/seeker | Mentee/seeker, zaproszony | **Ładowanie. Gotowa:** lista zaproszonych mentorów. **Pusta. Błąd ładowania.** Bez sesji → s01; z niewłaściwą rolą → s08. | #11 AC: lista wyłącznie dla zaproszonych; decyzje L4–L6. Nie jest nowym dashboardem, tylko istniejącym miejscem docelowym. | `Page`, `FilterBar`/`Select`, `MentorRow`, `EmptyState`, `ErrorMessage`, `LoadingMessage`, `Skeleton`; istniejąca kompozycja E01. |
| s06 | Rezerwacje mentora — strona startowa mentora | Mentor | **Ładowanie. Gotowa:** rezerwacje mentora. **Pusta. Błąd ładowania.** Bez sesji → s01; z niewłaściwą rolą → s08. | Specyfikacja wskazuje `/mentor/bookings`; przyjęte miejsce startowe z decyzji L5. | `Page`, `BookingRow`, `BookingStatus`, `EmptyState`, `ErrorMessage`, `LoadingMessage`, `Skeleton`, `Button`; istniejące przykłady E01. |
| s07 | Zatwierdzenia operatora — strona startowa operatora | Operator z osobno nadanym uprawnieniem | **Ładowanie. Gotowa:** kolejka zatwierdzeń. **Pusta. Błąd ładowania.** Bez sesji → s01; bez uprawnienia operatora → s08. | Specyfikacja wymienia `/operator/approvals`; miejsce startowe przyjęte w L5. Model uprawnienia operatora przyjęty w L4, wymaga uzgodnienia z AGENTS.md. | `Page`, `Table`/`DataTable`, `EmptyState`, `ErrorMessage`, `LoadingMessage`, `Skeleton`, `Button`; brak przykładowej kompozycji ekranu operatora. |
| s08 | Brak dostępu | Zalogowany bez uprawnienia do żądanej strony | **Brak wymaganej roli:** neutralna odmowa i link do własnej strony startowej. **Niezalogowany:** przekierowanie do s01, z zachowaniem tylko same-origin return path. **Sesja wygasła:** komunikat i ponowne logowanie; po sukcesie bezpieczny powrót, jeśli nadal dozwolony. Nie ujawniać, czy ukryty zasób istnieje; takie zasoby zachowują 404. | #11 AC i #14 AC ograniczają dostęp do listy i sesji; uogólnienie zachowania i bezpieczny powrót przyjęto w L6 i L9. | `Page`, `Alert` lub `ErrorMessage`, `TextLink`, `Button`; brak udokumentowanej kompozycji ekranu odmowy dostępu. |

**Uwaga o ekranach startowych:** s05–s07 wskazują istniejące miejsca docelowe, nie nowe dashboardy. „Pusta”, „ładowanie” i „błąd” są stanami danych tych stron. Nie dodawać kalendarza, rozmów, ocen, kodów rabatowych ani innych elementów niewymienionych w źródłach.

## 2. Scenariusze do przełączania w prototypie

Kontrolki symulują wyniki; nie oznaczają, że produkt ma takie ustawienie ani integrację.

| Przełącznik | Wyniki do ręcznego wywołania | Status względem przyjętych decyzji |
|---|---|---|
| Sposób wejścia | E-mail/link magiczny | Jedyna ścieżka uwierzytelnienia w prototypie; GitHub wyłączony (L2). |
| Odpowiedź e-maila | Wysłano dla zaproszonego; wysłano dla niezaproszonego (ten sam komunikat); limit; awaria | Niezaproszony nie otrzymuje wiadomości. Wspólna odpowiedź, limit i błąd wynikają z kontraktu i istniejących historii UI. |
| Rejestracja | Brak osobnej rejestracji; pierwsze użycie ważnego linku przez zaproszoną osobę tworzy konto | Osobny formularz i weryfikacja rejestracji są wyłączone (L3). |
| Link e-mailowy | Prawidłowy; wygasły po 15 min; użyty ponownie; błąd weryfikacji | Link jednorazowy; błędny, wygasły lub użyty link pokazuje błąd i możliwość zamówienia nowego (L8). |
| Sesja | Aktywna; wygasła | Po wygaśnięciu logowanie i bezpieczny powrót do adresu same-origin, jeśli dostęp jest nadal dozwolony (L9). |
| Konto/rola | Seeker; mentor; operator; seeker+mentor; niezalogowany; zalogowany bez właściwego uprawnienia | Operator ma osobno nadawane uprawnienie; użytkownik nie może sam go przyznać (L4). |
| Strona startowa | Lista mentorów; rezerwacje mentora; zatwierdzenia operatora; pusta; ładowanie; błąd | Miejsca docelowe ustalone w L5; stany ładowania/pusty/błąd są symulacją UI. |

## 3. Konta i dane demo

Wszystkie poniższe konta są fikcyjne, przeznaczone wyłącznie do lokalnego prototypu. Domeny `.test` nie służą do wysyłki e-maili. Nie używać prawdziwych haseł, tokenów ani integracji.

| Konto demo | E-mail demo | Rola w prototypie |
|---|---|---|
| Maja Demo | `maja.mentee@demo.test` | Seeker (mentee) |
| Ada Kowalska | `ada.mentor@demo.test` | Mentor; nazwisko występuje w fikcyjnych danych przykładowych Storybooka |
| Ola Operator | `ola.operator@demo.test` | Operator; fikcyjna nazwa, nie przypisuje prawdziwej osobie uprawnień |
| Alex Demo | `alex.dual@demo.test` | Seeker + mentor |

**Dane referencyjne:** brief opisuje pilotaż 2.11–14.12.2026, sesję tekstową 25 minut za 25 EUR oraz odpowiedź z vault za 10 EUR. Dane cenowe i sesje nie należą do ekranów logowania; umieszczono je tu wyłącznie jako kontekst zgodności z briefem, nie jako treść do dodania do stron startowych. Nazwy Ada Kowalska, Jan Nowak, Maria Wiśniewska i Piotr Zieliński pochodzą z przykładowych danych Storybooka (nie z briefu).

**Stałe „teraz” prototypu:** `2026-11-03T13:00:00Z` (UTC), zgodne z przykładową datą sesji Storybooka. To techniczna kotwica demonstracji, nie decyzja produktowa.

## 4. Luki w specyfikacji — pytania i przyjęte decyzje

Decyzje poniżej przyjęto do mapy i prototypu na polecenie użytkownika. Nie zostały jeszcze zapisane jako decyzje produktowe w źródłowych plikach.

1. **Brak właściwej historii/specyfikacji.** Pytanie: czy zakres kont i ról ma własną historię/specyfikację? **Przyjęta decyzja:** E01-T01 / #10 jest źródłową historią; #12–#14 pozostają zgodne z backlogiem. Do #10 należy dopisać kryteria dla przyjętego zakresu. Nie przypisujemy nowego numeru issue ani nie tworzymy specyfikacji w ramach tej edycji mapy.
2. **Metoda logowania.** Pytanie: które metody są w pilocie? **Przyjęta decyzja:** magic link e-mailowy dla zaproszonych; logowanie GitHubem i hasłem poza zakresem prototypu. Proponowane D24 należy formalnie zapisać/uzupełnić przed implementacją.
3. **Rejestracja i weryfikacja.** Pytanie: czy jest publiczna rejestracja? **Przyjęta decyzja:** nie w pilocie. Konto powstaje przy pierwszym użyciu ważnego linku przez zaproszoną osobę; brak osobnego ekranu rejestracji i osobnej weryfikacji e-maila.
4. **Nazwy i model ról.** Pytanie: czy „mentee” oznacza „seeker”, role mogą się łączyć i jak nadawany jest dostęp operatora? **Przyjęta decyzja:** „mentee” = „seeker”; konto może być jednocześnie seekerem i mentorem; uprawnienie operatora jest nadawane osobno i nie jest samoobsługowe. **Nierozstrzygnięta sprzeczność źródeł:** trzeba uzgodnić to z AGENTS.md, który wyklucza RBAC, i ze specyfikacją, która chroni operacje rolą. Do czasu aktualizacji źródeł jest to założenie mapy, nie zmiana architektury.
5. **Strony startowe.** Pytanie: dokąd kierować każdą rolę? **Przyjęta decyzja:** seeker → lista mentorów; mentor → jego rezerwacje; operator → zatwierdzenia. Są to istniejące miejsca docelowe, nie nowe dashboardy.
6. **Odmowa dostępu.** Pytanie: co widzą niezalogowani i użytkownicy z niewłaściwą rolą? **Przyjęta decyzja:** niezalogowany jest kierowany do s01; zalogowany bez uprawnienia widzi neutralne s08 i link do swojej strony startowej. Zasoby, których istnienie ma być ukryte, nadal zachowują 404. Powrót po logowaniu dozwolony tylko do adresu same-origin.
7. **Konflikty kont.** Pytanie: jak obsłużyć istniejący adres i połączenie metod? **Przyjęta decyzja:** zachować jednakową odpowiedź e-mailową bez ujawniania, czy konto/zaproszenie istnieje. Nie łączyć kont automatycznie ani ręcznie w pilocie; GitHub jest wyłączony. W prototypie konflikt adresu nie ujawnia stanu konta i prowadzi do ponownego logowania tym samym e-mailem.
8. **Weryfikacja i sukces.** Pytanie: jak długo działa link i co po sukcesie? **Przyjęta decyzja:** link jednorazowy, ważny 15 minut; po poprawnym użyciu natychmiastowe przekierowanie na bezpieczny adres albo stronę startową roli. Nie ma osobnego ekranu sukcesu.
9. **Wygaśnięta sesja.** Pytanie: co z adresem docelowym po ponownym logowaniu? **Przyjęta decyzja:** pokazać informację o wygaśnięciu, zachować wyłącznie bezpieczny adres same-origin i wrócić do niego po ponownym logowaniu, jeśli dostęp nadal jest dozwolony; w przeciwnym razie użyć strony startowej roli. Zachować niesensytywne dane formularza tylko wtedy, gdy jest to bezpieczne.

## 5. Luki w design systemie — pytania i przyjęte decyzje

1. **Wzorzec logowania GitHubem.** Pytanie: czy DS ma komponent dostawcy? **Przyjęta decyzja:** GitHub jest poza zakresem, więc nie dodajemy wzorca ani stanów dostawcy.
2. **Osobna rejestracja i weryfikacja e-maila.** Pytanie: czy potrzeba dla nich kompozycji? **Przyjęta decyzja:** nie w pilocie; nie dodajemy formularza rejestracji ani jego stories. Istniejący stan „Check your email” pozostaje częścią s01.
3. **Strony ról i odmowa dostępu.** Pytanie: czy potrzebny jest wspólny wzorzec? **Przyjęta decyzja:** korzystać z istniejących `Page`, list, `EmptyState`, `ErrorMessage` i `Alert`; nie tworzyć nowego prymitywu. Pozostaje luka przykładowych kompozycji: szczególnie ekran operatora i s08 nie mają screen stories, należy je opisać przed budową prototypu.
4. **Niespójność Card / LoginView.** Pytanie: który wariant obowiązuje? **Przyjęta decyzja:** stosować `Card` zgodnie z przewodnikiem design systemu. Istniejący `LoginView` i jego story wymagają późniejszego ujednolicenia; nie zmieniamy komponentów w tym zadaniu.
5. **Sukces weryfikacji.** Pytanie: czy tworzyć ekran/stories sukcesu? **Przyjęta decyzja:** nie, sukces natychmiast przekierowuje; osobnym stanem pozostają ładowanie i błędy linku.

## 6. Liczby

- **Identyfikatory ekranów:** 8 (s01–s08); 6 aktywnych w prototypie, 2 zachowane jako wyłączone z zakresu (s02–s03), bez zmiany identyfikatorów.
- **Stany ekranów:** 25 (aktywne ekrany s01, s04–s08; stany do ręcznego wywołania nie są dodatkowymi ekranami).
- **Luki w specyfikacji:** 9.
- **Luki w design systemie:** 2 otwarte (brak przykładowych kompozycji operatora i odmowy dostępu; niespójność Card z istniejącym LoginView). Trzy pozostałe zamknięte decyzjami zakresowymi.

---

Mapa zaktualizowana według przyjętych propozycji i czeka na zatwierdzenie. Identyfikatory s01–s08 pozostają stałe. To nadal wyłącznie mapa i decyzje do prototypu; nie zmieniono kodu, backlogu, briefu ani źródeł architektonicznych.
