# Tokeny: DevMentor

- Data: 2026-10-27. Źródło decyzji: `lekcja-06/referencje.md` (decyzje przyjęte: R01.1–R01.3, R01.5, R02.1–R02.3, K1, A01).
- Istniejący plik tokenów: `packages/ui/src/styles/index.css` (nie `packages/ui/src/tokens.css`, którego nie ma). Font kodu `--mono` jest osobno w `packages/app/src/app/globals.css`.
- Motywy: projekt ma jeden motyw (ciemny, `color-scheme: dark`). Jasnego motywu nie ma i żadna przyjęta decyzja go nie wymaga, więc kontrast liczony jest dla jednego motywu.
- Zatwierdzone przez zlecającego 2026-10-27: akcent zostaje `#e5f520`; `--input` zmienia się na `#76706a`; `--destructive-foreground` zmienia się na `#1a1919`; skala i przypisania odstępów; warstwa surowa dopisana do tej tabeli.
- Ten plik opisuje tokeny. **Nie zmienia** pliku CSS w repozytorium: wdrożenie zmian jest osobnym krokiem.
- Zasada nazw: warstwa surowa może opisywać wygląd i jest używana tylko w pliku tokenów. Warstwa znaczeniowa nazywa przeznaczenie. Istniejące nazwy shadcn (`--background`, `--primary`…) już są znaczeniowe i zostają.

## Tabela tokenów

| Token | Warstwa | Wartość | Pochodzenie | Gdzie używać | Gdzie nie używać |
|---|---|---|---|---|---|
| `palette-ink-975` | surowa | `#1a1919` | istniejące (`--primary-foreground`) | źródło dla `--primary-foreground` i `--destructive-foreground` | w komponentach |
| `palette-ink-950` | surowa | `#141313` | istniejące | źródło dla `--background` | w komponentach |
| `palette-ink-900` | surowa | `#1c1b1b` | istniejące | źródło dla `--card` | w komponentach |
| `palette-ink-850` | surowa | `#262524` | istniejące | źródło dla `--muted` i `--secondary` | w komponentach |
| `palette-ink-800` | surowa | `#2f2e2c` | istniejące | źródło dla `--accent` (tło hover) | w komponentach |
| `palette-stone-500` | surowa | `#948d85` | istniejące | źródło dla `--soft` i `--muted-foreground` | w komponentach |
| `palette-stone-600` | surowa | `#76706a` | nowa, wymóg kontrastu 3:1 dla obramowań pól | źródło dla `--input` | w komponentach |
| `palette-cream-100` | surowa | `#edf5cd` | istniejące | źródło dla `--foreground` | w komponentach |
| `palette-lime-400` | surowa | `#e5f520` | R01.5, istniejące | źródło dla `--primary` i `--ring` | w komponentach |
| `palette-red-500` | surowa | `#ef4444` | istniejące | źródło dla `--destructive` | w komponentach |
| `--background` | znaczeniowa | `palette-ink-950` | P1 (propozycja, istniejąca paleta jest już ciepła) | tło strony | tło paneli i wierszy |
| `--card` | znaczeniowa | `palette-ink-900` | istniejące | panele, które trzeba wyodrębnić (np. pole wpisywania) | każdy blok treści: wiersze oddziela linia, nie karta (R01.1) |
| `--foreground` / `--headline` | znaczeniowa | `palette-cream-100` | istniejące | tekst główny, nagłówki, nagłówki kolumn (R01.3) | tekst pomocniczy |
| `--muted-foreground` / `--soft` | znaczeniowa | `palette-stone-500` | istniejące | autor i czas wiadomości (R02.3), tekst pomocniczy | główna treść |
| `--primary` | znaczeniowa | `palette-lime-400` | R01.5 | jedna główna akcja na ekran, link, aktywny stan | dekoracja, tło dużych powierzchni, wskaźnik sukcesu (konflikt K3 otwarty) |
| `--primary-foreground` | znaczeniowa | `palette-ink-975` | istniejące | tekst na `--primary` | na innych tłach |
| `--ring` | znaczeniowa | `--primary` | istniejące | fokus przy obsłudze klawiaturą | dekoracja |
| `--border` | znaczeniowa | `rgba(255,255,255,.10)` | R01.1 | cienka linia między wierszami i pod nagłówkiem kolumn | obramowanie pola lub przycisku (ma 1,3:1) |
| `--input` | znaczeniowa | `palette-stone-600` (**zmiana** z `rgba(255,255,255,.14)`) | R02.2 (pole pisania), wymóg WCAG 1.4.11 | obramowanie pól i przycisków, pole pisania | separator wierszy |
| `--muted` | znaczeniowa | `palette-ink-850` | istniejące | tło kodu i nazw plików (R01.2) | zwykłe panele |
| `--destructive` | znaczeniowa | `palette-red-500` | istniejące | tekst, ikony i tło akcji destrukcyjnej | akcent ogólny |
| `--destructive-foreground` | znaczeniowa | `palette-ink-975` (**zmiana** z `#fafafa`) | wymóg kontrastu 4,5:1, token istniejący, poza referencjami | tekst na tle `--destructive` | tekst na innych tłach |
| `--font-code` | znaczeniowa | `var(--mono)` (stos systemowy z `globals.css`) | R01.2 | kod, nazwy plików, yaml, polecenia | proza, nagłówki |
| `--border-width-hairline` | znaczeniowa | `1px` | R01.1 („cienkie”) | każda linia rozdzielająca | grubsze ramki dekoracyjne |
| `space-group` | znaczeniowa | `8px` | K1, R02.1 (wartość: propozycja zatwierdzona) | w grupie (etykieta i pole, autor i czas) | między grupami |
| `space-between-groups` | znaczeniowa | `16px` | K1 | między grupami w panelu | w grupie |
| `space-panel-compact` | znaczeniowa | `12px` | K1 (listy i tabele gęsto) | wnętrze wiersza listy mentorów lub pytań | widok sesji |
| `space-panel-roomy` | znaczeniowa | `24px` | K1, R02.1 (sesja przestronnie) | wnętrze panelu i wątku w widoku sesji | listy i tabele |
| `space-section` | znaczeniowa | `48px` | K1 | między sekcjami strony | wewnątrz panelu |
| `--table-header-foreground` | komponent | `--headline` | R01.3 | nagłówki kolumn | komórki danych |
| `--message-meta-foreground` | komponent | `--muted-foreground` | R02.3 | autor i czas przy wiadomości | treść wiadomości |
| `--composer-border` | komponent | `--input` | R02.2 | pole pisania w sesji | inne pola (używają `--input`) |

Skala odstępów (surowa): 4, 8, 12, 16, 24, 32, 48 px. Wartości 4 i 32 są w skali, ale nie mają przypisanej relacji. Promienie (`--radius` 8 px i pochodne) zostają bez zmian: żadna przyjęta decyzja ich nie dotyczy.

## Lista par kolorów (ciemny motyw, jedyny)

Kontrast policzony dla wartości zatwierdzonych (zmienione wartości nie różnią się od tych, które były liczone w propozycji, więc pary zostały policzone ponownie z nimi). Progi: 4,5:1 dla tekstu, 3:1 dla elementów interfejsu.

**Przechodzą**

| Para | Kontrast | Próg |
|---|---|---|
| `--foreground` na `--background` | 16,38 | 4,5 |
| `--foreground` na `--card` | 15,17 | 4,5 |
| `--foreground` na `--muted` | 13,51 | 4,5 |
| `--foreground` na `--accent` | 11,98 | 4,5 |
| `--muted-foreground` na `--background` | 5,66 | 4,5 |
| `--muted-foreground` na `--card` | 5,24 | 4,5 |
| `--muted-foreground` na `--muted` | 4,67 (o włos) | 4,5 |
| `--primary-foreground` na `--primary` | 14,55 | 4,5 |
| `--primary` jako tekst na `--background` | 15,38 | 4,5 |
| `--primary` jako tekst na `--card` | 14,25 | 4,5 |
| `--ring` (fokus) na `--background` | 15,38 | 3 |
| `--destructive` jako tekst na `--background` | 4,93 | 4,5 |
| **`--destructive-foreground` (nowy `#1a1919`) na `--destructive`** | **4,66** (było 3,61) | 4,5 |
| **`--input` (nowy `#76706a`) na `--background`** | **3,79** (było 1,49) | 3 |
| **`--input` na `--card`** | **3,52** (było 1,54) | 3 |
| **`--input` na `--muted`** | **3,13** | 3 |

**Nie przechodzą i świadomie zostają**

| Para | Kontrast | Uzasadnienie |
|---|---|---|
| `--border` na `--background` | 1,31 | Linia rozdzielająca wiersze (R01.1), nie granica elementu sterującego: próg 3:1 jej nie dotyczy |
| `--border` na `--card` | 1,34 | Jak wyżej |

Jeśli linia ma być jedyną granicą pola lub przycisku, musi używać `--input`, a nie `--border`.

Po zatwierdzonych zmianach żadna para tekst i tło ani element sterujący nie spada poniżej progu. Jedyna para blisko progu to `--muted-foreground` na `--muted` (4,67).

## Decyzje, które nie są tokenami

**Zasady (kiedy czego używać)**
- Wiersze list oddziela cienka linia (`--border`, `--border-width-hairline`), nie karta i nie cień (R01.1, A01).
- Gęstość zależy od ekranu: gęsto na listach i tabelach (`space-panel-compact`), przestronnie w widoku sesji (`space-panel-roomy`) (K1).
- Widok sesji ma jedną kolumnę, z rozmową w środku (R02.1).
- Jedna główna akcja na ekran w kolorze `--primary` (R01.5). Pełna zasada „jeden wyróżniony element na ekran” (P2) czeka na zatwierdzenie.
- Zakazy z A01: gradienty (także w tekście nagłówka), `backdrop-filter`, iskierki, fioletowy i indygo jako akcent.
- Obramowanie elementu sterującego używa `--input`, nie `--border`.

**Cechy komponentów**
- Tabela i lista: nagłówek każdej kolumny wyraźny, w `--table-header-foreground`, z linią pod spodem (R01.3).
- Wiadomość: autor i czas przy każdej wiadomości, w `--message-meta-foreground` (R02.3).
- Pole pisania: stale dostępne przy wątku, z obramowaniem `--composer-border` (R02.2, forma jako propozycja).

**Nie ma tokenów, bo nie ma przyjętej decyzji**
- P1–P7, P9–P14 z `referencje.md` (poza tym, że istniejąca paleta już jest ciepła).
- Ruch i ton (M1–M3, T1–T3): bez tokenów czasów animacji, żeby nie wymyślać wartości.
- Kolor statusu (zapłacono, zaakceptowano): konflikt K3 (zielony akcent a zielony jako sukces) otwarty. Dopóki nie ma decyzji, status nie używa `--primary` jako jedynego nośnika znaczenia.
- Typografia poza fontem kodu (font główny, skala rozmiarów, wagi): brak referencji (luka w `referencje.md`).
