# Referencje: DevMentor

- Data: 2026-10-27.
- Kto wybierał: zlecający (karty R01, R02, A01 z promptu oraz odpowiedzi z 2026-10-27). Wszystko, co dodał agent, ma status „propozycja”.
- Zrzuty: brak (zlecający odmówił dostarczenia). Karty podają nazwy serwisów, nie linki. **Wszystkie obserwacje są parafrazą opisu zlecającego**, nie opisem ekranu.
- Słowa charakteru (propozycja, niepotwierdzone): rzeczowy, gęsty, ciepły, spokojny, konkretny.
- Antycharakter (propozycja, niepotwierdzony): generyczny, krzykliwy, szkolny, towarzyski, ozdobny.

Podstawa propozycji charakteru: R01 (gęstość, ciepło), R02 (rozmowa, szybkość), A01 (generyczność) i wypowiedzi z badań (`.ai/specs/research/`): „nie chcę relacji. chcę odpowiedzieć na pytanie i mieć spokój”, „nie chcę się uczyć helma, chcę żeby ingress wstał”, „to jest coś sprzedażowego?”.

## Referencje

| # | Referencja | Źródło | Kto wybrał | Obserwacja | Bierzemy | Nie bierzemy | Robimy zamiast tego | Dlaczego pasuje do produktu | Rodzina | Waga | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R01.1 | GitHub | strona repozytorium i lista pull requestów; link: nie otwarty, zrzut: brak | zlecający | Wiersze listy oddzielone cienką linią. Grubość i kolor linii nie są znane (zrzut: brak) | cienkie linie między wierszami | (propozycja) karta ani ramka wokół każdego wiersza, cień jako separator (A01) | | Developerzy czytają listy wierszy na co dzień. Lista mentorów i lista pytań to wiersze do porównania | kompozycja i gęstość | musi być | przyjęte (z opisu). Zakres linii (tylko między wierszami czy też wokół bloków) otwarty |
| R01.2 | GitHub | jak wyżej | zlecający | Kod i nazwy plików są składane innym fontem niż reszta tekstu. Że to font o stałej szerokości, jest parafrazą (zrzut: brak) | kod i nazwy plików osobnym fontem | (propozycja) kod jako ozdoba: kolor akcentu lub ikony przy kodzie (akcent jest na jedną akcję, R01.5) | | Pytania zawierają kod i konfigurację (fintech: yaml przed oczami mentora). Kod i nazwy muszą się odróżniać od prozy | typografia | musi być | przyjęte (z opisu) |
| R01.3 | GitHub | jak wyżej | zlecający | Dużo informacji na ekranie, a ekran jest czytelny. Według zlecającego czytelność daje wyraźny nagłówek każdej kolumny | gęstość z wyraźnymi nagłówkami kolumn | (propozycja) gęstość bez nagłówków: ściana liczb i atrybutów, której nie da się porównać (K2) | | Lista mentorów ma kilka atrybutów w wierszu (technologia, cena, publiczna praca). Nagłówki pozwalają je porównać | kompozycja i gęstość | musi być | przyjęte (odpowiedź 2) |
| R01.4 | GitHub | jak wyżej | zlecający (opis), agent (zamiennik) | „Wszystko szare, mało ciepła” (opis zlecającego) | | wszystko szare, mało ciepła | ciepłe szarości jako neutralne (P1; przykład z promptu, nie wartość zlecającego) | Produkt ma być spokojny i ludzki, a nie jak panel techniczny. Uzasadnienie częściowe: badania nie mówią nic o ciepłych szarościach | kolor | musi być | propozycja (P1) |
| R01.5 | odpowiedź na „mało ciepła” | odpowiedź 3 z 2026-10-27, bez referencji wizualnej | zlecający | Jeden kolor akcentu, jasnozielony. Odcień nie jest podany (nie ma wartości ani zrzutu) | jeden kolor akcentu, jasnozielony | indygo i fiolet jako akcent (patrz A01) | | Akcent odróżnia wyraźnie od generycznego startupu AI. Uzasadnienie w badaniach: brak | kolor | musi być | przyjęte (odpowiedź 3). Odcień zatwierdzony później w `tokeny.md` (`#e5f520`, 2026-10-27). Patrz konflikt K3 |
| R01.6 | GitHub | jak wyżej | zlecający (opis), agent (zamiennik) | „Trudno się zorientować, co jest najważniejsze” (opis zlecającego) | | ekran bez hierarchii | jeden wyróżniony element na ekran (P2) | Użytkownik z limitem czasu (fintech: rollback po 5 minutach, D08) potrzebuje od razu znaleźć cenę i akcję | kompozycja i gęstość | musi być | propozycja (P2) |
| R02.1 | Slack | widok kanału z wątkiem; link: nie otwarty, zrzut: brak | zlecający | Rozmowa zajmuje środek ekranu (parafraza opisu „rozmowa jest w centrum”) | rozmowa w centrum | (propozycja) panele i boczny pasek wokół rozmowy (R02.6) | | Sesja to wymiana tekstu 25 lub 50 minut, a pisemna odpowiedź jest wynikiem produktu | kompozycja i gęstość | warto | przyjęte (z opisu) |
| R02.2 | Slack | jak wyżej | zlecający | „Szybko się pisze i odpisuje”. Forma pola (np. stale widoczne pod wątkiem) jest moją parafrazą (zrzut: brak) | szybkie pisanie i odpisywanie | (propozycja) pole pisania ukryte za przyciskiem lub wymagające dodatkowego kliknięcia | | Użytkownik chce odpowiedzi w 20 minut (fintech), sesje są ograniczone czasem | komponenty | warto | przyjęte (z opisu). Forma pola: propozycja |
| R02.3 | Slack | jak wyżej | zlecający | Przy każdej wiadomości widać, kto ją napisał i kiedy | autor i czas przy wiadomości | (propozycja) awatary z inicjałami na kolorowym tle (A01, P8) | | Mentor musi widzieć, kto pyta (mentor Python). Wiadomości w sesji są dowodem przebiegu | komponenty | warto | przyjęte (z opisu) |
| R02.4 | Slack | jak wyżej | zlecający (opis), agent (zamiennik) | „Za dużo powiadomień” (opis zlecającego) | | powiadomienia o wszystkim, liczniki | powiadomienia tylko o zmianie stanu sesji, bez liczników (P4) | Staff engineer: „chcę mieć spokój” | ruch i reakcja | warto | propozycja (P4) |
| R02.5 | Slack | jak wyżej | zlecający (opis), agent (zamiennik) | „Emoji wszędzie” (opis zlecającego) | | emoji jako ozdoba i reakcje | brak emoji w interfejsie, treść tekstem (P3) | Produkt jest tekstowy i rzeczowy. Powiązanie z użytkownikami częściowe: nikt nie mówił o emoji | ton wypowiedzi | warto | propozycja (P3) |
| R02.6 | Slack | jak wyżej | zlecający (opis), agent (zamiennik) | „Bałagan w bocznym pasku” (opis zlecającego) | | wielosekcyjny boczny pasek w widoku sesji | widok sesji w jednej kolumnie, bez bocznego paska (P5) | Sesja ma jedno zadanie: pytanie i odpowiedź. Uzasadnienie w badaniach: brak (propozycja z opisu) | kompozycja i gęstość | warto | propozycja (P5) |

## Antyreferencje

| # | Wygląd | Dlaczego nie | Podpis do uniknięcia | Źródło (gust / badania / propozycja) |
|---|---|---|---|---|
| A01 | Typowa strona startupu AI, czyli „generyczny wygląd AI” (połączone, bo A01 zlecającego opisuje to samo) | „Wygląda jak wszystko inne” (zlecający). Dodatkowo: „to jest coś sprzedażowego?” (mentor Python) | Zlecający: fioletowy gradient, szklane karty, iskierki. Propozycja rozszerzenia (P8): gradient w tekście nagłówka, pigułka z liczbą nad nagłówkiem, wyróżnione kolorem słowo w nagłówku, trzy identyczne karty z ikoną, rząd wielkich liczb, awatary z inicjałami na kolorowym tle, logo jako kolorowy kwadrat, indygo lub fiolet jako akcent. W kodzie: `linear-gradient`, `background-clip: text`, `backdrop-filter: blur`, palety indygo i fioletu | gust (A01 zlecającego), propozycja (rozszerzenie podpisu) |
| A02 | Kursy: paski postępu, certyfikaty, ścieżki nauki | Fintech: „nie chcę się uczyć helma, chcę żeby ingress wstał”, „subskrypcja. community. ścieżka nauki”. Trzech z czterech seekerów odrzuciło subskrypcję (brief). D02 | pasek postępu, odznaki, certyfikaty, „moduły” i „lekcje”, serie dni | badania, propozycja (P9) |
| A03 | Oceny i rankingi | N02. Fintech: „każdy ma pięć gwiazdek”. Mentor: „my GitHub is my profile”. Staff engineer: bez ocen | gwiazdki, średnia ocena, liczba opinii, „Top mentor”, ranking | badania, brief (N02), propozycja (P10) |
| A04 | Ściana rejestracji | Fintech: „nie że zakładam konto, weryfikacja maila, potem czekam”, rollback po 5 minutach bookingu (D08) | kreator „Krok 1 z 4”, modal powitalny, wymagany profil seekera przed pierwszym pytaniem, potwierdzenie maila blokujące wartość | badania, brief (D08), propozycja (P11) |
| A05 | Język sprzedażowy i etykiety seniority | „To jest coś sprzedażowego?” (mentor Python). Fintech: „nie »senior engineer« tylko »robiłem upgrade ingress-nginx na 1.28«” | „najlepsi eksperci”, „rozwiń karierę”, „Senior Engineer” jako jedyny opis, „Top mentor”. Zamiast tego konkretne zadanie i link do publicznej pracy | badania, propozycja (P12) |
| A06 | Wideo i rozmowa na żywo jako wzorzec | N01. Fintech: Codementor, rozmowa, mikrofon nie działał | ikona kamery, „Dołącz do rozmowy”, wskaźnik „na żywo” | badania, brief (N01), propozycja (P13) |
| A07 | Funkcje relacyjne i społecznościowe | Staff engineer: „nie chcę relacji. chcę odpowiedzieć na pytanie i mieć spokój” | „obserwuj”, feed, „poleć znajomym”, „połącz się”, wiadomości prywatne poza sesją | badania, propozycja (P14) |

## Konflikty i rozstrzygnięcia

| Konflikt | Referencje | Rozstrzygnięcie | Kto zdecydował |
|---|---|---|---|
| K1: dużo informacji na ekranie vs rozmowa w centrum, jedna kolumna | R01.3, R02.1, R02.6 | Gęsto na listach i tabelach (lista mentorów, lista pytań), przestronnie w widoku sesji | zlecający (zgoda z 2026-10-27 na propozycję agenta) |
| K2: „dużo informacji” vs „trudno się zorientować, co najważniejsze” (sprzeczność wewnątrz GitHuba) | R01.3, R01.6 | Gęstość z wyraźnymi nagłówkami kolumn (przyjęte) plus jeden wyróżniony element na ekran (P2, niezatwierdzone) | częściowo zlecający (nagłówki), reszta czeka na decyzję |
| K3: jeden jasnozielony akcent vs zielony jako kolor sukcesu i statusu oraz czytelność tekstu | R01.5 | Rozstrzygnięte 2026-10-28 dla koloru: osobny token `--status-success` (ciemny `#34d399`, jasny `#047857`), akcent nie oznacza sukcesu. Otwarte: czy komponenty statusów dostaną ton sukcesu. Pierwotne pytanie: czy statusy („zapłacono”, „zaakceptowano”) używają koloru akcentu, czy innego, oraz jak czytelny jest jasnozielony na jasnym tle (dla zieleni typu `#10b981` policzyłem wcześniej ok. 2,4:1 na jasnych tłach przy progu 4,5:1 dla tekstu) | zlecający (2026-10-28, zatwierdzenie tokenu `--status-success`) |

## Luki

Rodziny bez referencji lub z samymi propozycjami, oraz pytania bez odpowiedzi:

- **Kolor:** odcień akcentu został ustalony po sporządzeniu tego pliku: `#e5f520`, zatwierdzony w `tokeny.md` 2026-10-27 (żadna referencja nie podaje wartości, to decyzja zlecającego przy tokenach). Nadal otwarte: neutralne tło i kolory statusów to tylko propozycja P1, konflikt K3 (akcent a kolor sukcesu) bez rozstrzygnięcia. Jasny motyw: akcent jest tam tylko wypełnieniem (decyzja z 2026-10-27).
- **Typografia:** jedyna wskazówka to osobny font dla kodu i nazw. Brak referencji dla fontu głównego, skali rozmiarów i wag.
- **Komponenty:** są wskazówki tylko dla pola wpisywania, autora i czasu oraz nagłówków kolumn. Brak: przyciski, formularze, stany ładowania, pusto i błąd.
- **Kompozycja:** zakres cienkich linii (tylko między wierszami czy także wokół bloków) nie został wyjaśniony.
- **Zrzuty:** brak. Wszystkie obserwacje to parafrazy opisu.
- **Propozycje bez decyzji zlecającego:** P1–P7 i P9–P14. P8 jest uwzględniona w A01 jako rozszerzenie podpisu.

### Opisy dopisane na prośbę zlecającego (propozycje, bez wartości liczbowych)

Rodzina **ruch i reakcja** (referencje: R02.2 „szybko się pisze”, A01 „iskierki”, badania):
- M1. Reakcja natychmiastowa: wysłanie wiadomości i zmiana stanu są widoczne od razu, bez czekania na odpowiedź serwera. Źródło: fintech, limit 5 minut.
- M2. Bez ruchu dekoracyjnego: brak animacji nieskończonych, unoszących się kart, rozbłysków. Źródło: A01.
- M3. Zmiana stanu (zapłacono, zaakceptowano, odpowiedź gotowa) komunikowana tekstem, a nie samym ruchem lub kolorem. Źródło: staff engineer „spokój”, dostępność.

Rodzina **ton wypowiedzi** (referencje: A01, badania):
- T1. Nazywa zadanie, nie rolę: „robiłem upgrade ingress-nginx na 1.28”, a nie „senior engineer”. Źródło: fintech.
- T2. Bez haseł sprzedażowych i obietnic bez treści. Źródło: mentor Python „to jest coś sprzedażowego?”.
- T3. Cena i zasady podane wprost przed pytaniem (R04). Komunikaty błędów mówią, co zrobić. Źródło: brief R04, fintech „nie chcę czekać”.

## Obrazy

Brak plików. Zrzuty R01 (strona repozytorium i lista pull requestów) i R02 (kanał ze Slacka z wątkiem) nie zostały dostarczone. Nazwy zarezerwowane: `R01-github-repo-i-pr.png`, `R02-slack-kanal-z-watkiem.png`.

Nic w tym pliku nie jest jeszcze regułą. Zasady i tokeny powstają w następnym kroku, z tego pliku, i każdą z nich zatwierdzasz osobno.
