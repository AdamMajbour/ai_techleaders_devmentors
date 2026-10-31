# POSTEP: design system DevMentora i Storybook

Plik prowadzony po każdym etapie. Nowa sesja czyta go najpierw i kontynuuje od „Następny krok”.

## Stan

| Etap | Status |
|---|---|
| 0. Inwentaryzacja i plan | zakończony 2026-10-27, pytania 1–5 odpowiedziane, czeka na „dalej” (zatwierdzenie planu i zależności); akcent w jasnym motywie rozstrzygnięty |
| 1. Fundamenty | zakończony 2026-10-27, propozycje 1–8 przyjęte |
| 2. Komponenty bazowe | zakończony 2026-10-27 (3 partie, 16 stron komponentów), czeka na „dalej” przed etapem 3 |
| 3. Komponenty produktu, wzorce, ekrany | partie 3A, 3B, 3C i 3D gotowe 2026-10-27, etap 3 zamknięty (3A: MarkdownView, symulacja API, wzorce Form, List with filters, Detail view, Confirm destructive action; 3B: komponenty E01, wzorce Paid action flow i Session thread, ekrany E01 z mapą stanów; 3C: komponenty E02, wzorzec Review queue, ekrany E02; 3D: PilotCountsTable i ekrany E03), czeka na „dalej” przed etapem 4 |
| 4. Strony, które uczą | gotowy 2026-10-27 (8 stron „Design system”, 3 brakujące strony komponentów, strony epików rozszerzone, `docs/design-system.md` i odwołanie w AGENTS.md), czeka na „dalej” przed etapem 5 |
| 5. Sprawdzenie i raport | gotowy 2026-10-28; naruszenie dostępności (hover przycisku destrukcyjnego) naprawione tego samego dnia |

## Zatwierdzone decyzje

Z `lekcja-06/referencje.md` i `lekcja-06/tokeny.md` (zatwierdzone przez zlecającego 2026-10-27):
- R01.1 cienkie linie między wierszami, R01.2 kod i nazwy plików osobnym fontem, R01.3 gęstość z wyraźnymi nagłówkami kolumn, R01.5 jeden jasnozielony akcent (`#e5f520`), R02.1 rozmowa w centrum (jedna kolumna), R02.2 szybkie pisanie i odpisywanie, R02.3 autor i czas przy wiadomości, A01 (antyreferencja: generyczny wygląd AI).
- K1: gęsto na listach i tabelach, przestronnie w widoku sesji.
- Tokeny: `--input` → `#76706a`, `--destructive-foreground` → `#1a1919`, skala odstępów 8/16/12/24/48, warstwa surowa `palette-*`, brak jasnego motywu w decyzjach.

## Zatwierdzone 2026-10-27 po etapie 0

P1–P7 i P9–P14 (ciepłe szarości, jeden wyróżniony element na ekran, brak emoji, powiadomienia tylko o stanie sesji, brak bocznego paska, charakter i antycharakter, antyreferencje A02–A07).

## Nadal niezatwierdzone

M1–M3, T1–T3. Konflikt K3 (zielony akcent a zielony jako sukces) otwarty.

## Odpowiedzi na pytania z etapu 0 (2026-10-27)

1. Propozycje P1–P7 i P9–P14 **zatwierdzone** (wszystkie): dokumentacja może je cytować jako źródło. M1–M3 i T1–T3 nie były w pytaniu, zostają propozycjami.
2. Zgoda na zmianę istniejącego design systemu: przebudowa `button`, `card`, `input`, `textarea`, `table` na tokeny i plik tokenów w trzech warstwach.
3. Typografia: **zostać przy stosie systemowym**, bez bundlowania fontu. Brak plików fontów do dołączenia. Font kodu: stos systemowy.
4. Motywy: **budować też jasny**. Brak referencji dla jasnego motywu, więc jego wartości są propozycją. Skutek: potrzebny przełącznik motywu (zasada 9) i testy w obu motywach.
5. Zakres komponentów bazowych zatwierdzony: Button, TextLink, Input, Textarea, Select (natywny, ostylowany), Checkbox, Field, Panel/Card, StatusBadge, Alert, Dialog, ConfirmDialog, Table i istniejące stany. Odrzucone: Avatar, Menu, Popover, Tooltip, Tabs, Switch, Radio, Toast.

## Decyzja o akcencie w jasnym motywie (2026-10-27)

Wybrana opcja **(a)**: limonka `#e5f520` tylko jako wypełnienie (ciemny tekst `#1a1919` na niej, 14,55:1). W jasnym motywie linki są w kolorze tekstu z podkreśleniem, a fokus w kolorze tekstu `#1a1919`. Brak nowych kolorów.

Wartości jasnego motywu **zaakceptowane** (propozycja zatwierdzona): background `#f7f5f2`, card `#ffffff`, muted `#ece9e4`, accent `#e3e0da`, foreground `#1a1919`, muted-foreground `#6b655e`, obramowanie pola `#8a847c`, destructive `#b91c1c` (biały tekst na nim). Kontrast ma być policzony jeszcze raz dla zapisanych wartości w etapie 1.

## Zatwierdzenie planu technicznego

„Dalej” z 2026-10-27 zatwierdziło plan i listę zależności z etapu 0. Zainstalowane w etapie 1: `storybook`, `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-a11y`, `@storybook/addon-vitest` (10.6.5), `vitest` i `@vitest/browser-playwright` (5.0.5), `vite` (8.3.5), `@tailwindcss/vite`, `remark-gfm`, `lucide-react`. Nie zainstalowane jeszcze (dojdą w swoich etapach): `msw`, `react-markdown`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-checkbox`, `@radix-ui/react-label`.

## Etap 1: co zbudowano

- **Tokeny:** `src/styles/tokens.css` (trzy warstwy, motywy ciemny i jasny, źródło w komentarzu przy tokenach), `src/styles/index.css` (tylko mapowanie na Tailwinda).
- **Storybook:** `.storybook/` (main, preview z przełącznikiem motywu na elemencie głównym dokumentu, manager z nazwą DevMentor, `storybook.css`), `vitest.config.mts`, skrypty `storybook`, `build-storybook`, `test:stories` (oba motywy), `tokens:contrast`, `check:tokens`.
- **Foundations (7 stron MDX):** Color, Typography, Spacing and layout, Shape and depth, Motion, Icons, Themes, z blokami pomocniczymi w `.storybook/blocks/`.
- **Skrypty:** `scripts/contrast.mjs` (mierzy kontrast z zapisanych wartości, kończy się błędem poniżej progu), `scripts/check-tokens.mjs` (wartości spoza tokenów, kończy się błędem, do CI), `scripts/test-stories.mjs`.
- **Poza katalogiem design systemu (tylko konfiguracja):** `eslint.config.mjs` (ignoruje `**/storybook-static/**`), `package-lock.json`.

## Etap 1: co sprawdzone

- `build-storybook` przechodzi. Indeks zawiera 7 stron Foundations. Zbudowany CSS zawiera klasy `gap-group`, `p-panel-compact`, `py-section`, `text-page-title`, `font-code`, `font-strong` i oba motywy.
- Tabele w MDX: po zbudowaniu 0 surowych wierszy `|---|`, tabele są elementami (`remark-gfm` działa).
- Kontrast obu motywów z zapisanych wartości: wszystkie pary wymagane przechodzą (najcieńsze: `muted-foreground` na `muted` 4,67 w ciemnym, `destructive` na `card` 4,57 w ciemnym, `input` na `muted` 3,06 w jasnym).
- `type-check` i `eslint` (ui i app): bez błędów. `npm test`: 159 testów przechodzi.
- Aplikacja po zmianie tokenów: strony `/`, `/ui-preview`, `/articles` i `/api/articles` odpowiadają 200, CSS zawiera nowe tokeny.
- Brak zewnętrznego CDN w zbudowanym Storybooku.

## Etap 1: czego NIE sprawdzono

- **Nic nie obejrzano w przeglądarce** (brak Chromium, brak `libnspr4.so`). Wygląd stron Foundations, działanie przełącznika motywu w interfejsie i w stronach dokumentacji bez stories oraz tytuł karty są niesprawdzone wizualnie. Przełącznik motywu oparty jest o kanał Storybooka (`setGlobals`, `globalsUpdated`) i o dekorator.
- Tytuł karty przeglądarki: skrypt podmienia „Storybook” na „DevMentor” (sprawdzony w jsdom, nie w Storybooku). Inne napisy „Storybook” w wewnętrznych stronach interfejsu managera (np. ustawienia i skróty) nie są ukrywane: konfiguracja Storybooka tego nie umożliwia.
- `test:stories`: nie ma jeszcze żadnych stories (etap 2), więc testy się nie wykonują ("No test files found"). Testy przeglądarkowe i dostępność w przeglądarce nie były uruchamiane.
- Skrypt `check:tokens` kończy się błędem na 7 wartościach w istniejących komponentach (`button`: `[font-family:inherit]`; `input` i `textarea`: `transition-[color,box-shadow]`, `ring-[3px]`; `table`: `translate-y-[2px]` ×2). Zostaną usunięte w etapie 2.

## Propozycje autora z etapu 1 do decyzji

1. Skala typograficzna: 24/18/14/13/12 px, rola „numbers” z cyframi tabelarycznymi, wagi 400 i 600, interlinia 1,5 i 1,25.
2. `--measure-text` 65 znaków.
3. Szerokości układu: `--layout-content-max` 72 rem, `--layout-session-max` 44 rem.
4. Czasy ruchu: `--duration-fast` 100 ms, `--duration-base` 150 ms, 0 ms przy `prefers-reduced-motion` (M1–M3 nie zatwierdzone).
5. Rozmiary ikon 16 i 20 px.
6. Overlay (dialog) oddzielony obrysem `--input` i przyciemnieniem, bez cienia.
7. Jasny motyw: `--border` `rgba` o przezroczystości 0,12 (wartości zatwierdzone dotyczyły reszty tokenów jasnego motywu).
8. Odchylenie nazewnicze: w `tokeny.md` font kodu to `--font-code`. W kodzie token to `--family-code`, a klasa Tailwinda to `font-code` (token o nazwie `--font-code` byłby odwołaniem do samego siebie w `@theme inline`).
9. Konflikt K3 (kolor sukcesu a zielony akcent) nadal otwarty.

## Etap 1: propozycje przyjęte (2026-10-27)

Wszystkie 8 propozycji z etapu 1 przyjęte (skala typografii, 65 znaków, szerokości układu, czasy ruchu, rozmiary ikon, dialog bez cienia, `--border` jasnego motywu 0,12, nazwa `--family-code` przy klasie `font-code`). K3 nadal otwarty. Uwaga do poprawy w dokumentacji: strona Shape and depth cytuje A01 jako źródło reguły „bez pigułek”, ale A01 w `referencje.md` nie wymienia pigułek. To propozycja autora, nie A01. Źródło poprawię przy pracy nad tą stroną.

## Etap 2: plan partii

- Partia 1: Button, TextLink, Input, Textarea, Select (natywny, ostylowany), Checkbox.
- Partia 2: Field (etykieta, podpowiedź, błąd, wymagane lub opcjonalne), Panel (Card), StatusBadge, Alert, Dialog, ConfirmDialog.
- Partia 3: Table (nagłówki kolumn, R01.3), szkielet ładowania, EmptyState, ErrorState (istniejące stany `feedback/*` restylowane).
- Ograniczenie: aplikacja używa `Button` z `variant="outline"`, `variant="ghost"`, `size="sm"` i `Card`; kodu aplikacji poza katalogiem design systemu nie zmieniam, więc istniejące nazwy wariantów muszą dalej działać.

## Etap 2, partia 1: odpowiedzi przyjęte (2026-10-27)

1. Wysokości kontrolek: kompaktowa 32 px, domyślna 40 px. 2. Najechanie na przycisk główny: wariant A (90% tokenu). 3. Fokus: pierścień 2 px w `--ring`, odstęp 2 px w kolorze tła, bez przezroczystości. 4. Zablokowany: tokeny zamiast przezroczystości, `aria-disabled` i `disabledReason`. 5. Warianty przycisku: cztery do używania (`default`, `outline`, `ghost`, `destructive`), `secondary` i `link` zostają dla zgodności.

## Etap 2, partia 1: co zbudowano

- Komponenty (`src/components/ui/`): `button` (przebudowany, `disabledReason`, `min-h-control`), `text-link` (nowy, ręcznie pisany jak Button), `input` i `textarea` (przebudowane), `select` (nowy, ostylowany natywny), `checkbox` (z CLI shadcn, przepisany). `lib/utils.ts`: `cn` skonfigurowany na klasy z tokenów.
- Tokeny kontrolek: `--control-height`, `--control-height-compact`, `--control-padding-x`, `--control-padding-x-compact`, `--focus-ring-width`, `--focus-ring-offset`.
- Testy jednostkowe (Jest): 28 nowych i zaktualizowanych, razem w repozytorium 187 (przechodzą).
- Stories (31) i strony dokumentacji (6, po 13 sekcji): `src/components/ui/*.stories.tsx`, `.storybook/docs/primitives/*.mdx`. Bloki pomocnicze: `StateMatrix`, `DoDont`. CSS zamrożonych stanów w `.storybook/storybook.css` (warianty `hover`, `focus-visible`, `active` rozszerzone o `data-preview-state`).
- Zależności: dodano tylko `@radix-ui/react-checkbox`. CLI shadcn dopisało `cn` i `radix-ui`, usunięte (nie są w planie).
- Fallback bez przeglądarki: `vitest.jsdom.config.mts` i `src/components/ui/ui.stories.spec.tsx`, skrypt `npm run test:stories:jsdom`.

## Etap 2, partia 1: co sprawdzone

- Type-check bez błędów, ESLint bez błędów (ui i app), `npm test`: 187 testów przechodzi.
- `test:stories:jsdom`: 33 testy przechodzą (31 stories z funkcjami `play` i kontrolą dostępności axe, plus 2 testy samej bramki). Bramka naprawdę przerywa: historia z polem bez etykiety kończy się błędem `label`. Portable stories nie rzucają błędem same, tylko zapisują wynik w `reporting`, więc test sprawdza raport jawnie.
- `build-storybook` przechodzi (13 stron dokumentacji, 31 stories). CSS zawiera selektory `:is(:hover,[data-preview-state=hover])` i `:is(:focus-visible,[data-preview-state=focus])`. W aplikacji obowiązuje zwykły `:focus-visible`.
- `check:tokens`: zostały tylko 2 trafienia w `table.tsx` (partia 3).
- `tokens:contrast`: wszystkie pary przechodzą w obu motywach.
- Aplikacja: `/`, `/login`, `/register`, `/ui-preview`, `/articles` odpowiadają 200, HTML ma nowe klasy (`min-h-control`, `text-body`), zero `ring-[3px]`.

## Etap 2, partia 1: czego NIE sprawdzono

- Nic nie obejrzano w przeglądarce. Wygląd komponentów, zamrożone stany w macierzach, fokus i obie kolorystyki są niesprawdzone wizualnie. Testy przeglądarkowe `npm run test:stories` nie były uruchamiane.
- Kontrast w trybie jsdom jest wyłączony (brak canvasa), mierzy go `tokens:contrast` z wartości tokenów, nie z wyrenderowanych pikseli.
- Reguła axe `target-size` (24 × 24 px) nie była sprawdzana w przeglądarce.
- `jsdom` jest zależnością przechodnią (z `jest-environment-jsdom`), nie zadeklarowaną w `packages/ui`. Zadeklarować go jawnie wymaga Twojej zgody (poza planem).

## Etap 2, partia 1: propozycje autora do decyzji

1. Brak osobnego stylu „wciśnięty” (Button, TextLink): zostaje wygląd najechania.
2. Ładowanie przycisku: etykieta w czasie ciągłym („Sending…”) i `disabled`; brak spinnera.
3. Pola formularza (Input, Textarea, Select, Checkbox) nie mają stylu najechania.
4. Mapa promieni: kontrolki `rounded-md`, panele `rounded-lg` (z poprzedniego etapu).
5. TextLink: najechanie pogrubia podkreślenie, bez zmiany koloru.
6. Checkbox 24 × 24 px (zgodnie z WCAG 2.5.8), a etykieta jest częścią celu kliknięcia.
7. Select to ostylowany natywny `<select>` ze strzałką lucide (bez Radix Select).
8. Textarea ma minimalną wysokość ok. 96 px (`min-h-24`).
9. Przycisk z `disabledReason` zmienia DOM: owija się w `span` z powodem pod spodem.
10. Pionowe odstępy przycisków `py-group` (8 px) i `py-1` (4 px) są z skali Tailwinda i tokenu relacji, nie z osobnego tokenu kontrolki.
11. `size="lg"` przycisku to alias `default` (nazwa zostaje dla zgodności z kodem aplikacji).

## Etap 2, partia 2: co zbudowano

- `field` (nowy: etykieta, podpowiedź, błąd, wymagane lub opcjonalne; łączy je z kontrolką przez `Slot`), `card` (przebudowany, nazwy zachowane, `density`), `status-badge` (nowy, ręcznie pisany), `alert` (z CLI, przepisany), `dialog` (z CLI, przepisany), `alert-dialog` (z CLI, przepisany), `confirm-dialog` (nowy).
- Testy jednostkowe: 40 suites, 227 testów w repozytorium (przechodzą). Stories: 58 w sumie (27 nowych), 19 stron dokumentacji, 6 nowych po 13 sekcji.
- CLI shadcn: `add dialog alert-dialog alert` dopisało `cn` i `radix-ui` (usunięte, spoza planu); na pytaniu o nadpisanie `button.tsx` zawisło za pierwszym razem, za drugim odpowiedziałem „nie”. Sprawdzone: nic z moich plików nie zostało nadpisane. Dodano tylko `@radix-ui/react-alert-dialog`. `@radix-ui/react-label` nie instaluję: natywny `<label>` wystarcza.

## Etap 2, partia 2: co sprawdzone

- Type-check bez błędów, ESLint bez błędów (ui i app), `npm test`: 227 testów przechodzi.
- `test:stories:jsdom`: 60 testów przechodzi (58 stories z funkcjami `play` i kontrolą dostępności axe, plus 2 testy bramki). Dialogi i alert dialog działają w jsdom (fokus, `Escape`, zwrot fokusu na wyzwalacz).
- `build-storybook`: 19 stron dokumentacji, 58 stories, 0 surowych tabel Markdown, każda z 12 stron komponentów ma 13 numerowanych sekcji.
- `check:tokens`: tylko 2 trafienia w `table.tsx` (partia 3). `tokens:contrast`: wszystkie pary przechodzą. Aplikacja: wszystkie 5 stron odpowiada 200.
- ESLint wykrył `useState` w funkcji `render` historii; poprawione (komponent o nazwie z wielkiej litery).

## Etap 2, partia 2: czego NIE sprawdzono

- Nic w przeglądarce: wygląd nakładki (`bg-background/80`), zamrożone stany, ramki z dialogami w dokumentacji, pułapka fokusu w prawdziwej przeglądarce i kolejność czytania czytnika ekranu.
- Kontrast i rozmiar celu jak w partii 1 (jsdom ich nie mierzy). Kontrast `--destructive` jako tekstu na `--card` w ciemnym motywie to 4,57:1, czyli blisko progu.
- Historia `LabelAndErrorWiring` nie klika etykiety w tym teście (jsdom + `userEvent` Storybooka rzuca `view is not of type Window`); kliknięcie etykiety pokrywa `field.test.tsx`.

## Etap 2, partia 2: propozycje autora do decyzji

1. Podpowiedź pola stoi pod etykietą, przed kontrolką.
2. „(required)” i „(optional)” jako tekst w etykiecie; oznaczać mniejszość pól.
3. Błąd pola ma `role="alert"` (ogłaszany w chwili pojawienia się).
4. Card: `rounded-lg`, bez cienia, gęstość `roomy`/`compact` przez atrybut `data-density`.
5. StatusBadge: tylko trzy tony (`neutral`, `active`, `danger`); tony sukcesu i ostrzeżenia czekają na K3; przypisanie tonów do statusów produktu to propozycja; komponent leży w `components/ui` (spec 1 planowała `backend/status/`).
6. Alert: `default` to `status`, `destructive` to `alert`; brak przycisku zamknięcia.
7. Dialog: obrys `--input` i zasłona `bg-background/80`, bez cienia i bez animacji; przycisk „Close”; szerokość do ok. 32 rem.
8. ConfirmDialog: wywołujący zamyka dialog po sukcesie; fokus startuje na „Cancel”; `pending` blokuje oba przyciski; błąd pokazuje alert w środku.
9. Dialogi w dokumentacji renderują się w ramce (`inline: false`); „Do and don't” dla Dialog i ConfirmDialog to tabele, nie żywe pary.
10. Nadal propozycje z partii 1 (1–11), na które nie odpowiedziałaś.

## Etap 2, partia 3: co zbudowano

- `table` (przebudowany: nagłówki kolumn `scope="col"`, linie zamiast ramek, odstępy z tokenów, brak wartości arbitralnych), `skeleton` (z CLI, przepisany: statyczny, `aria-hidden`), `backend/feedback/EmptyState`, `ErrorMessage`, `LoadingMessage` (przestylowane na tokeny, API bez zmian), tokeny komponentów zmapowane w Tailwindzie (`text-table-header-foreground`, `text-message-meta-foreground`, `composer-border`).
- Testy: 42 suites, 242 testy w repozytorium (przechodzą). Stories 75 w sumie, strony dokumentacji 23 (7 Foundations i 16 komponentów, każdy z 13 sekcjami).
- CLI shadcn dopisało `cn` (usunięte). Zależności całego etapu 2: tylko `@radix-ui/react-checkbox`, `@radix-ui/react-alert-dialog`.
- Strona Spacing and layout poprawiona: tabela na 320 px przewija się w swoim kontenerze (wcześniej obiecywała zamianę w listę wierszy, której nie ma).

## Etap 2, partia 3: co sprawdzone

- Type-check bez błędów, ESLint bez błędów, `npm test`: 242 testy przechodzą. `test:stories:jsdom`: 77 testów przechodzi (75 stories i 2 testy bramki).
- `check:tokens`: **zero wartości spoza tokenów** w całym design systemie. `tokens:contrast`: wszystkie pary przechodzą w obu motywach.
- `build-storybook`: 23 strony, 75 stories, 0 surowych tabel Markdown, 13 sekcji na każdej stronie komponentu.
- Aplikacja: `/`, `/login`, `/ui-preview`, `/articles` odpowiadają 200, CSS aplikacji zawiera klasy nowej tabeli. `DataTable` i istniejące testy przechodzą bez zmian kodu `DataTable`.

## Etap 2, partia 3: czego NIE sprawdzono

- Nic w przeglądarce (wygląd tabeli, przewijanie poziome przy 320 px, fokus, oba motywy). Kontrast i rozmiar celu jak w partiach 1 i 2.
- `DataTable` (istniejący wzorzec w `backend/tables`) nadal używa odstępów ze skali Tailwinda (`gap-3`, `text-sm`), nie tokenów relacji. Poprawię go przy wzorcu „lista z filtrami” w etapie 3.

## Etap 2, partia 3: propozycje autora do decyzji

1. Skeleton nie pulsuje (animacja nieskończona to ruch dekoracyjny, A01, WCAG 2.2.2). Stan ładowania jest ogłaszany tekstem (`LoadingMessage`).
2. Tabela bez zebry, bez najechania na wiersz (wiersz nie jest przyciskiem), zaznaczony wiersz to powierzchnia `--muted` z kolumną lub znakiem, nie sam kolor.
3. Tabela przewija się poziomo w swoim kontenerze przy wąskim ekranie. Lista wierszy do tego (planowana) jest w „What is missing”.
4. `ErrorMessage` zostaje pod tą nazwą (kompatybilność z istniejącym kodem) i jest stroną „error state”.
5. EmptyState bez ilustracji i bez ikony w kafelku.
6. Brak tonów sukcesu i ostrzeżenia w StatusBadge (K3) i brak Toast (decyzja z etapu 0).

## Etap 2: czego brakuje (do strony „What is missing” w etapie 4)

Lista wierszy (alternatywa dla tabeli na telefonie), grupa pól (`fieldset`) i grupa radio (poza planem), pole z wyszukiwaniem, ton sukcesu i ostrzeżenia (K3), paginacja jako osobny komponent (jest w `DataTable`), pole pisania sesji i element wiadomości (etap 3), `MarkdownView` (E02).

## Etap 3: plan (do zatwierdzenia)

Komponenty produktu w `src/components/<koncept>/` (standard projektu), strony dokumentacji pod „Product”, pogrupowane według epików.

- **E01 (#7):** `mentors/MentorRow`, `bookings/PriceNotice`, `bookings/BookingStatus` (z `RefundStatusLine`), `bookings/BookingRow`, `bookings/QuestionForm`, `messages/MessageItem`, `messages/Composer`, `messages/SessionThread` (z wskaźnikiem okna sesji).
- **E02 (#8):** `notes/NoteEditor`, `notes/PublishNoticePanel`, `vault/VaultAnswerView` (z listą cytowań), `vault/ReviewItem`, `vault/CreditsPanel`; prymityw `backend/content/MarkdownView`.
- **E03 (#9):** `consents/TermsConsent`, `pilot/PilotCountsTable`.
- **Wzorce (`Patterns`, każdy ze stanami jako osobne stories):** Form, List with filters, Detail view, Confirm destructive action, Paid action flow, Review queue, Session thread.
- **Ekrany (pełny ekran, z mapą stanów):** E01: logowanie, lista mentorów, profil i pytanie, powrót z płatności, moje rezerwacje, rezerwacje mentora (akceptacja i odmowa), sesja. E02: notatki z edytorem i panelem publikacji, kolejka podglądów, zakup odpowiedzi vaultu i jej stany. E03: zgoda na warunki przy płatności, liczby pilotażu u operatora.
- **Nie budowane:** E03-S02 (wypłata mentora przez Stripe): brak specyfikacji, trafia na „What is missing”.
- **Kolejność partii:** 3A MarkdownView, symulacja API, wzorce Form, List with filters, Detail view, Confirm; 3B komponenty E01, Paid action flow, Session thread, ekrany E01; 3C komponenty E02, Review queue, ekrany E02; 3D komponenty E03 i ekrany E03.

## Etap 3: odpowiedzi na plan (2026-10-27)

1. Zakres i kolejność partii zatwierdzone (E03-S02 nie budowane). 2. `react-markdown` zainstalowany. 3. Symulacja API: stub `fetch` zamiast `msw`. 4. Zgoda na przebudowę `CrudForm` i `DataTable`. 5. W stories roboczy tekst powiadomienia i warunków z oznaczeniem „wersja robocza, czeka na przegląd prawny”.

## Etap 3, partia 3A: co zbudowano

- `backend/content/MarkdownView` (bez HTML, bez obrazów, linki tylko http(s) i mailto, nagłówki obniżone o dwa poziomy, `linkPolicy` `safe` lub `none`) z 15 testami i 5 stories oraz stroną z 13 sekcjami.
- `CrudForm` przebudowany: `Field` zamiast własnych znaczników, `hint` i `requirement` w polach, walidacja po opuszczeniu edytowanego pola, ponowne sprawdzanie przy poprawianiu, fokus na pierwszym błędzie po nieudanym wysłaniu, `Alert` dla błędu całego formularza, tokeny zamiast skali Tailwinda. Zachowane: dane po błędzie, blokada podwójnego wysłania, `Ctrl+Enter` i `Escape`.
- `DataTable`: opcjonalne `caption` i `emptyAction`, szkielet w stanie ładowania (bez elementu tabeli), tokeny odstępów i typografii. API wsteczne zgodne.
- Pomocnik `.storybook/blocks/mockApi.ts`: stub `fetch` ze scenariuszami (`success`, `pending`, `fieldError`, `serverError`, `offline`), mówi kopertą `{ ok, data | error }`.
- Wzorce w `src/patterns/` (stories) i `.storybook/docs/patterns/` (4 strony po 12 sekcji): Form (9 stories), List with filters (8), Detail view (7), Confirm destructive action (8).
- `jest.config.mjs`: lista pakietów ESM (jose i drzewo `react-markdown`, 68 pakietów) przekazana do SWC, żeby Jest ładował `react-markdown`.

## Etap 3, partia 3A: co sprawdzone

- Type-check bez błędów. ESLint bez błędów (jedno ostrzeżenie w `jest.config.mjs` sprzed zmiany: anonimowy eksport domyślny). `npm test`: 43 suites, 268 testów przechodzi.
- `test:stories:jsdom`: 114 testów (112 stories i 2 testy bramki) przechodzi, w tym wszystkie stany wzorców z kontrolą dostępności.
- `build-storybook`: 28 stron (7 Foundations, 17 komponentów, 4 wzorce), 112 stories, 0 surowych tabel Markdown.
- `check:tokens`: zero wartości spoza tokenów. `tokens:contrast`: wszystkie pary przechodzą w obu motywach.
- Aplikacja: `/`, `/login`, `/register`, `/ui-preview`, `/articles` odpowiadają 200. `/login` renderuje `CrudForm` z `Field` (klasy `gap-between-groups`, `text-label`).
- Jeden istniejący test `CrudForm` miał asercję na szczegół znacznika (`<p>` z tekstem bezpośrednio w środku); zmieniłem ją na „dwa alerty” (zachowanie to samo). Pozostałe 6 oryginalnych testów bez zmian.

## Etap 3, partia 3A: czego NIE sprawdzono

- Nic w przeglądarce (wygląd formularza, chipy filtra, ramki dialogów, fokus). Testy E2E aplikacji (`npm run test:e2e`, buduje i uruchamia aplikację) nie były uruchamiane; ekrany logowania i rejestracji sprawdzone tylko przez odpowiedź HTTP i testy jednostkowe.
- Stub `fetch` mówi kopertą API ręcznie odtworzoną z `apiCall`; rzeczywiste trasy serwera nie były wywoływane.

## Etap 3, partia 3A: propozycje autora do decyzji

1. Walidacja po opuszczeniu pola działa tylko dla pól edytowanych (samo przejście klawiszem `Tab` nie pokazuje błędu).
2. Błędy serwera i klienta po nieudanym wysłaniu przenoszą fokus na pierwsze pole z błędem, w kolejności pól.
3. Tekst błędu w `Field` to jedno zdanie (błędy jednego pola łączone spacją).
4. `MarkdownView`: nagłówki obniżone o dwa poziomy; obrazy zawsze usuwane; `linkPolicy="none"` dla tekstu od AI.
5. Pasek filtrów (filtry, chipy, „Clear all filters”) jest przepisem w stories; wydzielę go do komponentu, gdy drugi ekran go potrzebuje (zasada z „Contributing”).
6. Stan filtra nie jest zapisywany w adresie (specyfikacja prymitywów odłożyła `useUrlState`).
7. Powrót na stronę 1 przy zmianie filtra.
8. Wzorzec Potwierdzenie: wywołujący zamyka dialog po sukcesie, a wynik zapisuje jako tekst na stronie.

## Etap 3, partia 3B: co zbudowano

- Komponenty E01 w `src/components/`: `mentors/MentorRow`, `bookings/{PriceNotice, BookingStatus (z RefundStatusLine), BookingRow, QuestionForm}`, `consents/TermsConsent`, `messages/{MessageItem, SessionWindow, Composer, SessionThread, parseMessageText}`. Pomocnik `lib/format.ts` (`formatPrice`, `formatClock`). `TermsConsent` przeniesiony z planowanej partii 3D do 3B, bo `QuestionForm` go potrzebuje.
- 88 stories w grupie `Product/` (każdy komponent: stany ładowania, błędu, pusty, długi tekst, wąski ekran, wiele elementów tam, gdzie mają sens) i 9 stron komponentów w `.storybook/docs/product/` po 13 sekcji.
- Wzorce: `Paid action flow` (11 stories, 12 sekcji) i `Session thread` (7 stories, 12 sekcji).
- Ekrany E01: `src/screens/e01-views.tsx` (przykładowe kompozycje, nie eksportowane z pakietu) i `src/screens/e01.stories.tsx` (34 stories, każdy to jeden stan jednego ekranu: logowanie, weryfikacja linku, lista mentorów z filtrem technologii, strona mentora z formularzem, powrót z płatności, rezerwacje szukającego i mentora, sesja). Strona epiku `Product/Epics/E01 Booking flow` z mapą stanów, regułami i listą tego, czego brak.
- Dane przykładowe: `.storybook/blocks/sampleData.ts` (bez ocen i liczb klientów; cena 25 EUR z specyfikacji E01).
- `lib/utils.ts`: `tailwind-merge` zna `max-w-content`, `max-w-session` i `border-composer-border` (3 nowe testy).
- `src/test/setup.ts`: atrapa `ResizeObserver` dla Jest (Radix mierzy checkbox w `<form>`), taka sama w `ui.stories.spec.tsx` dla runnera jsdom.

## Etap 3, partia 3B: co sprawdzone

- Type-check bez błędów. `npm run lint` bez błędów. `npm test`: 55 suites, 358 testów przechodzi (w tym 12 nowych plików testów: 11 dla komponentów E01 i narzędzi wiadomości oraz `format`).
- `test:stories:jsdom`: 218 testów (216 stories i 2 testy bramki) przechodzi z kontrolą dostępności (`a11y.test: 'error'`, bez reguły kontrastu w jsdom).
- `build-storybook`: 40 stron i 216 stories. `check:tokens`: zero wartości spoza tokenów. `tokens:contrast`: wszystkie pary przechodzą w obu motywach.
- Aplikacja: `/`, `/articles`, `/api/health` odpowiadają 200.
- Bramka dostępności znalazła dwa prawdziwe problemy, naprawione: `MentorRow` zawsze miał `h3` (przeskok poziomu pod `h1`, teraz prop `headingLevel`) oraz historyjka z dwoma `<main>`.

## Etap 3, partia 3B: czego NIE sprawdzono

- Nic w przeglądarce: wygląd, fokus, 320/768/1440 px, kontrast w renderze. Testy przeglądarkowe Storybooka i E2E aplikacji nie były uruchamiane (brak Chromium w sandboxie).
- Kliknięcie linku „pilot terms” w etykiecie: w jsdom i `fireEvent` nie zaznacza pola, a przeglądarka nie przekazuje kliku z linku do pola z definicji etykiety. `user-event` tę sytuację emuluje inaczej, więc test używa `fireEvent`. Nie sprawdzone w prawdziwej przeglądarce.
- Trasy z specyfikacji rezerwacji (`/api/bookings`, `/api/bookings/[id]/messages`) nie istnieją w aplikacji. Ekrany używają danych przykładowych, a przykłady kodu w dokumentach pokazują wywołania zgodne ze specyfikacją.

## Etap 3, partia 3B: zmiany względem planu i odkrycia

1. **Numeracja historii E01 w komentarzach była błędna** (miałem S01 dla logowania i S05 dla sesji). Poprawiona wg backlogu: logowanie E01-T01, lista mentorów S01, pytanie z płatnością S02, decyzja mentora S03, sesja S04.
2. **Mentor traci pytanie po odrzuceniu lub wygaśnięciu** (specyfikacja rezerwacji, Grill 8). `BookingRowData.question` jest opcjonalne, a wiersz pokazuje „You can no longer see this question.” Pierwsza wersja pokazywała pytanie zawsze: to był błąd, naprawiony z testem.
3. Ograniczenia pól z specyfikacji: `question` do 4000, `body` do 2000, więc `maxLength` w `QuestionForm` i `Composer` ma źródło. Minimum 10 znaków to nadal propozycja.

## Etap 3, partia 3B: propozycje autora do decyzji

1. Lista mentorów jest listą wierszy, nie tabelą. Przyjęta referencja R01.3 prosi o wyraźne nagłówki kolumn. Czy lista mentorów ma być `Table`?
2. `BookingRow` wylicza akcje ze statusu (`paid` i mentor). Specyfikacja zwraca z serwera `allowedActions`. Proponuję, żeby komponent przyjmował `allowedActions` zamiast zgadywać.
3. Tony statusów rezerwacji (neutralny, aktywny, zagrożenie; negatywny wynik dla szukającego jako zagrożenie, dla mentora neutralnie) to propozycja. Zależy od K3.
4. Format kwot: „25 EUR” w zdaniach i na przyciskach, „25.00 EUR” w tabelach. Trafi na stronę Content w etapie 4.
5. Okno sesji jako zwykły tekst z ostatniego czasu serwera, bez odliczania na żywo (odliczanie byłoby odczytywane co sekundę).
6. `Button` z `disabledReason` owija się w `<span>`, więc przy zniknięciu powodu element jest montowany od nowa. Jeśli fokus był na zablokowanym przycisku, a powód zniknął bez udziału użytkownika (np. po odpowiedzi serwera), fokus przepada. W tej partii to się nie zdarza (powód znika po akcji użytkownika w innym polu), ale to znane ograniczenie. Naprawa: stały wrapper dla wszystkich przycisków albo nowa implementacja. Czekam na decyzję.
7. Stany „success” i „warning” nadal nie istnieją (K3), więc ekrany ich nie używają.
8. `ui/src/screens/` to nowy katalog z przykładowymi kompozycjami (nie komponentami DS). Jeśli wolisz trzymać je tylko w `.storybook`, przeniosę.

## Etap 3, partia 3C: co zbudowano

- Komponenty E02: `notes/{NoteEditor, PublishNoticePanel}` i `vault/{VaultAnswerView, ReviewItem, CreditsPanel}`. `NoteEditor` to `CrudForm` ze wspólnym schematem (tytuł do 120, treść do 20000 znaków, limity z tabeli `notes`) i statusem notatki. `PublishNoticePanel` ma własny `Checkbox` (zgoda nigdy zaznaczona z góry, wysyła wersję powiadomienia), bo `CrudForm` nie ma pola `checkbox`, a dopisanie go to zmiana poza planem. Do `lib/format.ts` doszły `formatDate` i `formatDuration`.
- `QuestionForm` rozszerzony (moja własna partia 3B): `mentorName` opcjonalne, nowe `fieldHint`, domyślny opis „for one answer”. Dzięki temu pytanie do vaultu (10 EUR, limit 2000) używa tego samego formularza.
- 71 nowych stories w `Product/` (łącznie 159) i 5 stron komponentów po 13 sekcji. Wzorzec `Review queue` (9 stories, 12 sekcji). Ekrany E02: `src/screens/e02-views.tsx` i `e02.stories.tsx` (30 stories: notatki z kredytami, jedna notatka, odpowiedzi do przeglądu, zapytanie do vaultu, odpowiedź vaultu). Strona epiku `Product/Epics/E02 Notes and vault`.
- Treść powiadomienia D09 w stories to ROBOCZY TEKST z oznaczeniem „waiting for legal review (E03-T02)”: sześć punktów ze specyfikacji, nie tekst prawny.

## Etap 3, partia 3C: co sprawdzone

- Type-check, `npm run lint` bez błędów. `npm test`: 60 suites, 414 testów przechodzi (5 nowych plików komponentów, rozszerzone `format` i `QuestionForm`).
- `test:stories:jsdom`: 298 testów (296 stories i 2 testy bramki) przechodzi z kontrolą dostępności.
- `build-storybook`: 47 stron, 296 stories. `check:tokens` czysty, kontrast przechodzi w obu motywach. Aplikacja: `/`, `/articles`, `/api/health` odpowiadają 200.
- Bramka dostępności znalazła dwa prawdziwe problemy w `ReviewItem`, naprawione: powtarzające się regiony `section` o tej samej nazwie (teraz `div` z nagłówkami) i przeskok poziomu nagłówka (prop `headingLevel`, jak w `MentorRow`).

## Etap 3, partia 3C: czego NIE sprawdzono

- To samo co w 3B: nic w przeglądarce, brak testów przeglądarkowych i E2E.
- Trasy vaultu ze specyfikacji (`/api/notes`, `/api/vault-answers`, `/api/vault/previews`, `/api/mentor/credits`) nie istnieją. Ekrany używają danych przykładowych.
- Zachowanie ConfirmDialog przy zdejmowaniu notatki sprawdzone w jsdom (otwarcie), nie w przeglądarce.

## Etap 3, partia 3C: propozycje autora do decyzji

1. `ReviewItem`: Reject bez okna potwierdzenia. Konsekwencja (cała odpowiedź odrzucona, szukający dostaje zwrot) jest napisana przy polu powodu. Czy dodać `ConfirmDialog`?
2. Pole „Note” w edytorze używa czcionki tekstu, a notatki zawierają kod (R01.2). Czcionka stałej szerokości wymagałaby nowej opcji w `CrudForm`.
3. Teksty stanów odpowiedzi vaultu (np. „The mentors did not answer in time. You are refunded.”) to moje sformułowania; specyfikacja podaje tylko sens. Zdanie „You are refunded.” obowiązuje niezależnie od tego, czy zwrot czeka na operatora (D26 jest propozycją). Linia zwrotu pod spodem mówi, jak jest naprawdę.
4. Odpowiedź vaultu pokazuje pytanie szukającego, a mentor w `ReviewItem` widzi pytanie bez jego imienia (założenie A-2 specyfikacji, do potwierdzenia przez założyciela A).
5. `vault/VaultAnswerView` importuje `RefundStatusLine` z `bookings/`. Jeśli zwrotów będzie więcej, warto go przenieść do wspólnego miejsca.
6. `src/screens/e02-views.tsx` importuje dane przykładowe z `.storybook/blocks`. To widoki dokumentacyjne, ale zależność `src` na `.storybook` jest odwrócona; można przenieść dane do `src/screens`.
7. Poprawka z 3B (stały wrapper `Button` z `disabledReason`) nadal czeka: `PublishNoticePanel` i `QuestionForm` mają ten sam wzór zablokowanego przycisku.

## Etap 3, partia 3D: co zbudowano

- `pilot/PilotCountsTable`: tabela kryteriów pilotażu z nagłówkami kolumn (kryterium, wartość, próg wstępny, przegląd, status). Kryteria, progi i daty przeglądów pochodzą z D08 i są przekazywane z zewnątrz. Status to słowa („Window still open”, „Stop-or-revise condition met”, „Condition not met”), a decyzję o zatrzymaniu lub zmianie podejmują założyciele, nie komponent. Pod tabelą: płatności testowe nie są liczone, odpowiedź vaultu liczy się w statusie `released` (specyfikacje), progi są wstępne bez punktu odniesienia (D08).
- Ekrany E03 (`src/screens/e03-views.tsx`, `e03.stories.tsx`, 9 stories): zgoda na warunki przy płatności (E03-S01, na `QuestionForm` i `TermsConsent`), strona warunków pilotażu (ROBOCZY tekst, tylko fakty z D15, D16, D17, D18, D19 i R04, oznaczony jako czekający na przegląd prawny), liczby pilotażu w sześciu stanach. Wartości w tabeli to PRZYKŁADY (pilotaż się nie zaczął), co mówi widoczny `Alert` na ekranie.
- 16 nowych stories w `Product/` (łącznie 175), strona komponentu `PilotCountsTable` (13 sekcji) i strona epiku `Product/Epics/E03 Terms and pilot counts`. Wzorca nie dodawałem: plan go dla E03 nie przewiduje, a zgoda ma stronę `TermsConsent` i wzorzec Paid action flow.
- Poprawka w `QuestionForm` znaleziona przy ekranie zgody: gdy serwer odmawia zgody (`acceptedTerms`), fokus przechodzi na checkbox (wcześniej błąd był widoczny, ale fokus nie). `TermsConsent` dostał opcjonalne `id`. Test dodany.

## Etap 3, partia 3D: co sprawdzone

- Type-check i `npm run lint` bez błędów. `npm test`: 61 suites, 427 testów przechodzi.
- `test:stories:jsdom`: 314 testów (312 stories i 2 testy bramki) przechodzi z kontrolą dostępności.
- `build-storybook`: 49 stron, 312 stories. `check:tokens` czysty, kontrast przechodzi w obu motywach. Aplikacja: `/`, `/articles`, `/api/health` odpowiadają 200.
- Bramka dostępności znalazła `heading-order` na stronie warunków: `MarkdownView` obniża nagłówki o dwa poziomy, więc strona z samym `h1` dostawała `h4`. Warunki są teraz stałymi sekcjami z `h2`, a `MarkdownView` zostaje bez zmian.

## Etap 3, partia 3D: czego NIE sprawdzono

- To samo co w 3B i 3C: nic w przeglądarce, brak testów przeglądarkowych i E2E.
- Zapytanie o liczby pilotażu (E03-S03) nie istnieje i nie ma specyfikacji ekranu: kształt wiersza wywiodłem z D08 i ze zdań o zliczaniu w specyfikacjach rezerwacji i vaultu. Kryteria mierzone poza aplikacją (dostępność mentorów A04, pokrycie notatek A01) nie są w tabeli.

## Etap 3, partia 3D: propozycje autora do decyzji

1. Kształt wiersza liczb pilotażu (kryterium, wartość jako tekst, próg jako tekst, data przeglądu, trzy stany) to propozycja. Backend może zwracać liczby, a opis progu pochodzi z rekordu decyzji.
2. Ton `danger` dla „Stop-or-revise condition met” jest propozycją (zależy od K3). Stan spełnionego warunku nie jest błędem systemu, ale wymaga decyzji.
3. Strona warunków pilotażu jako osobna trasa (`/terms`) i jako link z formularza to założenie wynikające z `termsHref`; specyfikacja E03-S01 nie istnieje w repozytorium, tylko pozycja w backlogu.
4. Ekran zatwierdzania zwrotów operatora (`/operator/approvals` ze specyfikacji rezerwacji) nie jest w planie etapu 3. Trafia na stronę „What is missing”.

## Etap 3: podsumowanie

Etap 3 obejmuje komponenty E01, E02, E03 (poza E03-S02, bez specyfikacji), 7 wzorców (Form, List with filters, Detail view, Confirm destructive action, Paid action flow, Session thread, Review queue), 3 strony epików i 3 zestawy ekranów. Otwarte decyzje z partii 3A, 3B i 3C pozostają propozycjami.

## Etap 4: co zbudowano

- **8 stron w grupie „Design system”** (`.storybook/docs/design-system/`): Start here (charakter w trzech zdaniach, pięć kroków, tabela wszystkich 35 komponentów z importem, kiedy i kiedy nie), Components (katalog z małym działającym podglądem, grupą, zdaniem i linkiem), How to choose (osiem tabel „jeśli… to użyj…” z przykładem z produktu i źródłem), Usage and accessibility (klawiatura i fokus, formularze, kolor, ruch i treść, szerokości, reguły produktu; każda reguła ze źródłem), Content (ton, trzy zdania „mówi” i trzy „nie mówi”, przyciski, błędy, puste stany, formaty), What to avoid (trzy części, przy każdym punkcie jak rozpoznać w kodzie, dlaczego i czym zastąpić), What is missing (pokrycie backlogu, brakujące komponenty, decyzje, czego nie sprawdzono), Contributing (kiedy komponent, wariant lub nic; co ma strona; zmiana tokenu; kto zatwierdza; komendy).
- **Bloki pomocnicze** w `.storybook/blocks/`: `catalogue.tsx` (dane 35 komponentów i bloki `ComponentTable`, `ComponentGrid`) i `DocLink.tsx` (linki do stron w powłoce Storybooka, bo dokumenty są w ramce iframe). Kolejność stron w `preview.tsx` rozszerzona o osiem stron.
- **Skrypt `npm run check:catalogue`** (`scripts/check-catalogue.mjs`, wpis w `package.json`): każdy komponent eksportowany z `components` i `backend` musi być w katalogu, a każde `docs` musi istnieć w zbudowanym Storybooku. Wynik: 70 eksportów, 35 stron.
- **Trzy brakujące strony komponentów** (kryterium „każdy komponent ma stronę z 13 sekcjami”): `LoadingMessage` (z nowym plikiem stories, 4 stories), `CrudForm` i `DataTable` (na stories wzorców Form i List with filters).
- **Strony epików** rozszerzone o kroki przepływu, pliki źródłowe i pracę, która zostaje w produkcie.
- **`docs/design-system.md`** (plik agenta: charakter, tabela komponentów generowana z katalogu, tokeny znaczeniowe z przeznaczeniem, przewodniki, czego unikać, komendy) i jedno zdanie w `AGENTS.md` z odwołaniem.
- Poprawki treści: `Card.mdx` nie twierdzi już, że pole wiadomości i panel powiadomienia używają karty (nie używają); `LoadingMessage` powołuje się na zakaz nieskończonych animacji.

## Etap 4: co sprawdzone

- Type-check i `npm run lint` bez błędów i ostrzeżeń. `npm test`: 61 suites, 427 testów. `check:tokens` czysty (skaner złapał `p-[13px]` wpisane tekstem w „Start here”, poprawione), kontrast przechodzi w obu motywach.
- `test:stories:jsdom`: 319 testów (316 stories, 2 testy bramki i 5 testów podglądów z katalogu: cztery grupy komponentów i tabela z „Start here”) przechodzi z kontrolą dostępności.
- `build-storybook`: 60 stron (8 Design system, 7 Foundations, 20 Primitives, 18 Product, 7 Patterns) i 316 stories. Brak surowych tabel Markdown w skompilowanych stronach. `check:catalogue` przechodzi.
- Polecenia z „What to avoid” uruchomiłem na `src`: poza trzema opisanymi wyjątkami nie mają trafień (wyśrodkowane pojedyncze komunikaty w `EmptyState`, `ErrorMessage`, `LoadingMessage` i etykiecie przycisku; słowo „toast” w komentarzu `alert.tsx`; „★” tylko w testach i dokumentach, które sprawdzają jego brak).
- Aplikacja: `/`, `/articles`, `/api/health` odpowiadają 200.

## Etap 4: czego NIE sprawdzono

- Wygląd stron i podglądów, działanie linków `DocLink` (budują adres powłoki z okna nadrzędnego, nie klikane w przeglądarce) i szerokości 320, 768, 1440 px. Brak Chromium w sandboxie.
- Czy `DocLink` działa pod innym adresem bazowym niż katalog główny (np. Storybook hostowany w podkatalogu): zbudowane z `location.pathname`, nie testowane.
- Skrypt `check:catalogue` wykrywa eksporty regułą tekstową (nazwy zaczynające się wielką literą z `components` i `backend`), więc nie złapie komponentu eksportowanego w inny sposób.

## Etap 4: propozycje autora do decyzji

1. Priorytety w „What is missing” (wysoki, średni, niski) pochodzą z kolejności zależności backlogu; to moja propozycja.
2. Formaty dat, godzin i walut oraz „czasownik i obiekt” na przyciskach to propozycje (żadna referencja ich nie podaje); strona Content to mówi.
3. Reguła „komponent dopiero przy dwóch miejscach użycia” w Contributing to propozycja.
4. Dodałem `check:catalogue` do `package.json` (okablowanie) i jedno zdanie do `AGENTS.md`, o co prosił prompt. Nie zmieniałem nic innego poza katalogiem design systemu.
5. Istniejące strony aplikacji (`login`, `register`, `articles`) nie są dostosowane do nowych reguł; strona artykułów obejmuje wiersze kartami wbrew R01.1. Wpisane do „What is missing”.
6. `docs/design-system.md` zawiera tabelę komponentów wygenerowaną jednorazowo z katalogu; po dodaniu komponentu trzeba ją uzupełnić ręcznie (krok 5 w Contributing). Można dopisać generator.

## Ograniczenie środowiska

W sandboxie nie działa Chromium (brak `libnspr4.so`, doinstalowanie wymaga roota). Testy przeglądarkowe Storybooka (dodatek Vitest) i sprawdzanie 320/768/1440 px w przeglądarce nie dadzą się tu uruchomić. Plan zastępczy: testy interakcji i dostępności przez Jest + stories składane w jsdom (kontrastu jsdom nie zmierzy, kontrast liczę skryptem z tokenów), a testy przeglądarkowe przygotowuję do CI i opisuję jako niesprawdzone w tej sesji.

## Tokenizacja aplikacji (2026-10-28)

Na prośbę o zamianę wartości na sztywno w `packages/app/src` na tokeny. Plik tokenów: `packages/ui/src/styles/tokens.css` (`packages/ui/src/tokens.css` nie istnieje). Skan przed zmianą: 23 trafienia w 4 plikach (`globals.css`, `backdrop.tsx`, `page.module.css`); po zmianie 0. Decyzje zlecającego: nowy token zatwierdzony, `page.module.css` zachowany, tło tokenizowane (nie usuwane), zakres plików zatwierdzony.

- **Nowe tokeny** w `tokens.css` (warstwa surowa i znaczeniowa, oba motywy): `--status-success` (ciemny `#34d399`, jasny `#047857`; kontrast 9,65:1 i 5,04:1 na tle strony, 8,94:1 i 5,48:1 na karcie, para dopisana do `contrast.mjs` i wymuszana 4,5:1), `--vignette-edge` (ciemny `rgba(0,0,0,.45)`, jasny `rgba(26,25,25,.12)`, wartość jasna to propozycja), `--mask-opaque` i `--mask-partial` (tylko kanał alfa). Mapowanie Tailwinda: `--color-status-success`. Rozstrzyga to konflikt K3 co do koloru; komponenty statusów (`StatusBadge`) nie dostały tonu sukcesu.
- **`globals.css`:** maska, winieta, kropka statusu i tło `code` używają tokenów (`code` to `--muted`, wartość niemal identyczna).
- **`backdrop.tsx`:** canvas nie czyta `var()`, więc ziarno (`--foreground`, nieco ciemniejszy niż `#f8fec6`) i maska (`--mask-opaque`) są odczytywane z tokenów przy montowaniu komponentu. Zmiana motywu po zamontowaniu nie przemaluje ziarna do odświeżenia strony.
- **`page.module.css`:** plik nadal nie jest importowany. Lokalne zmienne o nazwach tokenów usunięte (przesłaniałyby tokeny), wartości zastąpione tokenami. Hover głównego przycisku to `--muted-foreground`, a nie `--accent` jak w pierwotnym mapowaniu (tekst `--background` na `--accent` miałby kontrast ok. 1,3:1). Reguły `prefers-color-scheme` zmieniające kolory usunięte: motyw wynika z tokenów.
- **Dokumentacja:** strona Color, Usage and accessibility, What is missing, `docs/design-system.md` i K3 w `referencje.md` uzgodnione z nowym tokenem.

Sprawdzone: skan `app/src` 0 trafień; `check:tokens`, `tokens:contrast`, type-check, `npm run lint`, `npm test` (430), build Storybooka, `check:catalogue`; stan jsdom 319/319; Chromium 315/316 w ciemnym (to samo znane naruszenie hover przycisku destrukcyjnego) i 316/316 w jasnym. Strona startowa w Chromium w obu motywach: kropka `rgb(52,211,153)` i `rgb(4,120,87)`, tło `code` `#262524`, ziarno rysowane z `--foreground`, maska identyczna jak wcześniej.

Niesprawdzone: strona startowa w jasnym motywie nie była obejrzana na zrzucie (tylko wartości obliczone); w ciemnym zrzucie widać znaczek „1 Issue” z narzędzi deweloperskich Next, którego treści nie udało mi się odczytać. Konsola przeglądarki nie zgłasza błędów ani ostrzeżeń, ale nie wykluczyłem, że pochodzi z mojej zmiany. Nie porównywałem ze stanem sprzed zmiany.

## Poprawka hovera przycisku destrukcyjnego (2026-10-28)

Naruszenie z etapu 5 (kontrast 3,95:1, wymagane 4,5:1 według WCAG 1.4.3, w ciemnym motywie) usunięte za zgodą zlecającego. `Button variant="destructive"` przy hoverze nie zmienia już tła (było 90% tokenu), tylko podkreśla etykietę (`hover:underline`, `underline-offset-4`). Tło zostaje takie jak w stanie spoczynku (4,66:1), a podkreślenie działa też bez koloru (WCAG 1.4.1). To wyjątek od decyzji z 2026-10-27 „hover = token w 90%” dla jednego wariantu; opisany na stronie Button. Test dodany (`button.test.tsx`).

Sprawdzone: `npm run test:stories` w Chromium, oba motywy, 316 z 316 (wcześniej ciemny 315); `npm test` 431; type-check, lint, `check:tokens`; hover obejrzany na zrzucie historyjki `States`.

## CI: job `storybook-tests` (2026-10-28)

Nowy job w `.github/workflows/ci.yml`, dopisany na końcu; job `verify` bez zmian. Kroki: checkout, setup-node (Node 22, cache npm), `npm ci`, `npx playwright install --with-deps chromium`, `npm run tokens:contrast`, `npm run test:stories` (oba motywy). Krok `tokens:contrast` zostawiony na prośbę zlecającego: strona Color czyta wygenerowany `.storybook/generated/contrast.json`, a ten jest dziś nieśledzony w gicie. Job nie był uruchomiony w CI (tylko składnia YAML sprawdzona parserem, a komendy lokalnie w tym samym kształcie).

## Etap 5: wyniki sprawdzenia

**Przeglądarka działa.** Wcześniejsze założenie „Chromium nie da się uruchomić” było nieaktualne: brakujące biblioteki systemowe (24 pakiety Debiana, m.in. `libnspr4`, `libnss3`) pobrałem do `/tmp/chromelibs` bez roota i bez instalacji w systemie, a Chromium startuje z `LD_LIBRARY_PATH` na ten katalog. To środowisko jednorazowe: po restarcie sandboxa trzeba je odtworzyć.

- Build, type-check, `npm run lint`: bez błędów i ostrzeżeń. `npm test`: 61 suites, 430 testów. `check:tokens`: zero wartości spoza tokenów. `tokens:contrast`: wszystkie pary przechodzą w obu motywach.
- **Testy historyjek w prawdziwym Chromium** (`npm run test:stories`, osobno motyw ciemny i jasny, z regułą kontrastu): jasny 316/316; ciemny 315/316 w chwili sprawdzenia, po poprawce hovera 316/316.
- **Znaleziska z przeglądarki, których jsdom nie pokazywał, i poprawki:** (1) przewijane kontenery (`Table`, bloki kodu w `MessageItem` i `MarkdownView`) nie były dostępne z klawiatury (axe `scrollable-region-focusable`, WCAG 2.1.1): dodałem `tabIndex={0}` z pierścieniem fokusu, 3 testy; 5 historyjek w każdym motywie przeszło. (2) Kod w bloku `MarkdownView` miał podwójne tło (`bg-muted` na `pre` i na `code`): usunięte.
- **Szerokości 320, 768 i 1440 px, oba motywy** (własny skrypt poza repozytorium, `/tmp/layout`): 1138 widoków (wszystkie historyjki przy 320 px; ekrany i wzorce także przy 768 i 1440), **0 przepełnień poziomych strony, 0 błędów strony, motyw zawsze zgodny z żądanym**. Przewijane kontenery liczone jako dozwolone. Niezmierzone: 14 widoków, bo w ciągu 5 s nie pojawił się w nich element w `#storybook-root`. Skrypt wypisał tylko pierwsze 10 z nich, wszystkie to historyjki `ConfirmDialog` (nakładka renderuje się poza korzeniem); pozostałych 4 nie zidentyfikowałem. Historyjki `ConfirmDialog` przeszły testy w Chromium.
- Obejrzałem zrzuty czterech ekranów (strona mentora 320 px jasny, sesja 1440 px ciemny, odpowiedzi do przeglądu 768 px jasny; lista mentorów nie została obejrzana, bo odczyt jej zrzutu został przerwany). Wygląd zgodny z tokenami: płaskie powierzchnie, jedna akcentowa akcja, kod w osobnym foncie.

### Naruszenie dostępności do decyzji (NAPRAWIONE 2026-10-28, patrz „Poprawka hovera”)

| Gdzie | Co | Dlaczego | Propozycja |
|---|---|---|---|
| `Button variant="destructive"`, stan hover, motyw ciemny (`button.stories.tsx > States`) | Kontrast 3,95:1 (tekst `#1a1919` na `#d93f3f`), wymagane 4,5:1 (WCAG 1.4.3) | Hover to „token w 90%”, a w ciemnym motywie 90% czerwieni na ciemnym tle ściemnia tło. Stan spoczynku ma 4,66:1 | Hover destrukcyjnego bez zmiany koloru tła, np. podkreślenie lub obramowanie. Nie zmieniałem: zasada „hover = 90%” była zatwierdzona |

Pozostałe stany i oba motywy: brak naruszeń. Kontrast w jsdom jest wyłączony, w przeglądarce włączony.

### Czego nadal nie sprawdzono

- Obsługa klawiaturą przez człowieka i czytnik ekranu (sprawdzone tylko regułami axe i testami `userEvent`).
- Nakładki (dialogi) wizualnie w obu motywach: tylko testy w Chromium i axe, bez oglądania.
- Ekran listy mentorów i pozostałe ekrany nieobejrzane na zrzutach; sprawdzone liczbowo (przepełnienie) i regułami axe.
- E2E aplikacji (`npm run test:e2e`) nie uruchamiane. Strony aplikacji nie są dostosowane do nowych reguł.

### Liczby

| Co | Ile |
|---|---|
| Strony dokumentacji (Storybook) | 60: 8 Design system, 7 Foundations, 20 Primitives, 18 Product (15 komponentów i 3 epiki), 7 Patterns |
| Komponenty w katalogu | 35 (70 eksportów) |
| Pliki stories | 43 |
| Historyjki | 316 |
| Testy interakcji (historyjki z `play`) | 100 |
| Testy jednostkowe (Jest) | 430 w 61 suites (cały monorepo; w `ui` 39 plików) |
| Testy w przeglądarce | 316 na motyw, razem 632 uruchomienia |
| Testy w jsdom (runner historyjek) | 319 |

## Etap 5: test agentem (przygotowany, NIE wykonany w tej sesji)

Test robisz Ty w nowej sesji, osobnym promptem. Nie wykonałem go, bo z tej rozmowy znam odpowiedzi, których nie ma w plikach. Agent testowy ma dostać tylko poniższy opis i dokumentację w repozytorium, bez tej sesji i bez tego pliku.

**Ekran do zbudowania:** strona operatora z zatwierdzaniem zwrotów, `(operator)/operator/approvals` (backlog E01-S03, specyfikacja rezerwacji). Nie ma go w Storybooku: ani komponentu, ani ekranu, ani stanów.

**Dlaczego ten:** wymaga wyboru wzorca, komponentów i stanów, a dokumentacja nie wskazuje wprost, który wybrać. To właśnie mierzy test.

**Fakty ze specyfikacji, na których agent ma pracować** (`.ai/specs/2026-10-26-pilot-booking-flow.md`, szukaj „operator” w tabeli API, „Edge cases” i „Risks”):
- Stronę widzi tylko operator. Lista to oczekujące prośby o zwrot: zainicjowane przez operatora albo z powodu, który nie jest zatwierdzany automatycznie.
- Każda pozycja ma podsumowanie rezerwacji, **bez treści pytania**.
- Operator może zatwierdzić (zwrot jest wykonywany) albo odrzucić (zwrot jest anulowany).
- Operator może otworzyć prośbę o zwrot dla rezerwacji opłaconej lub zaakceptowanej, np. gdy mentor się nie pojawił (`operator_initiated`), a potem zatwierdzić ją tym samym krokiem.
- Gdy bramka płatnicza zawodzi po zatwierdzeniu, zatwierdzenie zostaje, a zwrot jest ponawiany.

**Prompt do wklejenia w nowej sesji** (celowo bez odwołań do POSTEP.md):

> Zbuduj w Storybooku nowy ekran z backlogu: stronę operatora z zatwierdzaniem zwrotów (`(operator)/operator/approvals`, E01-S03). Fakty znajdziesz w `.ai/specs/2026-10-26-pilot-booking-flow.md` (wyszukaj „operator”) i w `.ai/specs/backlog.md`. Zacznij od `docs/design-system.md`, potem używaj tylko dokumentacji Storybooka (`packages/ui`) i kodu pakietu. Nie zadawaj pytań. Zapisz ekran jako stories ze wszystkimi stanami w `packages/ui/src/screens/`, z wpisem do mapy stanów. Nie dodawaj komponentów, wariantów ani zależności poza istniejącymi: jeśli czegoś brakuje, napisz co. Na końcu wypisz: (1) każde miejsce, w którym zgadywałeś, bo dokumentacja tego nie rozstrzygała; (2) które strony dokumentacji przeczytałeś; (3) komendy sprawdzające i ich wynik.

**Jak ocenię wynik:** każde „zgadywałem” uzupełnię w dokumentacji albo wpiszę do „What is missing”. Sprawdzę, czy agent użył istniejących wzorców i tokenów, czy `npm run check:tokens` i `test:stories:jsdom` przechodzą, i czy mapa stanów jest pełna.


## Następny krok

Etap 5 zakończony. Do Twojej decyzji: hover przycisku destrukcyjnego (wyżej), propozycje z etapów 1 do 4 oraz odpalenie testu agentem w nowej sesji. Nic nie zostało zacommitowane ani wypchnięte.
