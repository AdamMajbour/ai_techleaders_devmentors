# Walkthrough: Future state, booking and session (1.0), decided steps, `devmentor-synthetic-input/.ai/specs/product-brief.md`, 2026-10-25

Jeden przebieg nie daje żadnego findingu: wszystko poniżej to obserwacje *Seen once* `[SYNTHETIC]`, nie spełniają Definition of Ready z `SDLC.md`. Najważniejsze do sprawdzenia z ludźmi jako następne: czy próg dwóch godzin (R03/D22) mija się z tym, kiedy pomoc jeszcze się przydaje (A04), oraz czy płatna konsultacja w ogóle pasuje do sytuacji dewelopera, którego nic nie pali (A02). Oba punkty pochodzą z dwóch person i jednego przebiegu.

Stance: adversary (brief: Mode `own`, wybrany jawnie w poleceniu)
Panel: 1 przebieg × 2 persony; run 1: P01, P02
Basis: brief (Product, Key flows, Business rules, Non-goals, Scope, Glossary dla person; Target group, Problems, Riskiest assumptions tylko dla pytań) `[DOCUMENT]`/`[ASSUMPTION]`; notatki `working-dev` i `platform-dev` `[INTERVIEW]`; decyzje D07, D09, D21, D22, D27, N01 `[DOCUMENT]`. Pochodzenie opisane w `SOURCES.md`: notatki to dostarczone materiały demonstracyjne, bez niezależnego potwierdzenia rozmów.
Panel snapshot: `personas.md` w katalogu tej sesji
Session: `devmentor-synthetic-input/.ai/specs/research/walkthroughs/2026-10-25-future-state-booking-and-session-1-0-decided-steps-session-001/`; subject `devmentor-synthetic-input/.ai/specs/product-brief.md`; flow „Future state, booking and session (1.0), decided steps" (dokładne dopasowanie nagłówka)
Composition: założona; materiał nie podaje proporcji segmentów. Po jednej personie na segment, bo każdy segment ma jedną notatkę; miejsce „obojętnego" zajmuje P02 (platform-dev).
Saturation: not reached: w liście tematów P02 około sześciu z dwunastu było nowych względem P01 (ocena przybliżona, dwa wywiady)
Parity: 9 z 13 tematów odłożonej notatki `2026-09-01-interview-backend-dev-fintech.md` pojawiło się też w panelu; trzy z nich tylko ogólnikowo (patrz niżej)
Elapsed: persony 0 min (pisane ręcznie); wywiady i przejścia ok. 1 min na personę, równolegle (czas subagentów ~45 s każdy); pozostałe fazy nie mierzone
Not askable of this panel: brak; A02 i A04 dotyczą strony dewelopera. A01/A03 (brief ich nie podaje) nie dotyczą tego przepływu.

## 🎯 Scope and limits

- Przepływ: wybór i rezerwacja konsultacji, pięć kroków, jak opisuje brief. Medium: przejście narracyjne na papierze; brak ekranów, przeglądarki, aplikacji, transakcji. Żaden ekran nie został opisany ponad treść briefu.
- Wywiad, presje i przejście wykonał jeden subagent na personę w jednym wywołaniu (nie pytanie po pytaniu z osobnymi dostawami fragmentów). Fragmenty zostały dołączone do pytań w treści wywołania. To uproszczenie względem skryptu.
- Ceny i najwcześniejszy termin nie są w materiale; presje zastosowano jako „nieznane", bez wymyślonych wartości.
- Poza zakresem: płatności, anulowanie, wypłaty, onboarding mentorów, notatka po sesji (Non-goals briefu). Wynik nic o nich nie mówi.
- Brief poza `${SPECS_DIR}/product-brief.md`: w repozytorium istnieje osobny, inny `/.ai/specs/product-brief.md`; tego pliku nie czytano ani nie zmieniano.

## ⚠️ Persona audit and scenario assumptions (added after the run)

Profile lines were checked against the two notes on 2026-10-25. Removed as unsupported: P02's "terse, watches the time" and "brisk"/"rzeczowy" (interviewer's remarks about a short coffee meeting), P01's "workaround" as the person's word, and the reading of P01's subscription quote as a refusal. The subagents had received P02 as "rzeczowy, no time for long talks" and P01 with "workaround"; this may have made P02 more curt and more ready to leave than the note supports. Details: `personas.md` in this session (audit note) and the corrected `../../personas.md`.

Each Seen-once item rests on scenario assumptions that are not in the material (`[SCENARIO]`, table SC1–SC12 in the corrected `personas.md`):
- Item 1 (sign-in): SC1 and SC2, a free alternative open in another tab. Without it the persona may not leave.
- Item 2 (list without a quality signal): SC4 and SC5; the scenario card stressed "no score, not told how to judge", which may have steered both personas.
- Item 3 (two-hour floor): SC7, the earliest slot as "later today" or "after the need", qualitative values invented for the pressure.
- Item 4 (price): SC6, the unknown price and the hypothetical payer.
- Item 5 (code in a text session): SC8, code in own editor and repository.
- Item 6 and the outlier paragraph: SC9, the persona placed in the note's own situation.
These items are hypotheses about behaviour under those assumptions; the real check for each should test the assumption first.

## 🔍 Barriers that repeated (worst first, ties marked)

Brak. Przy jednym przebiegu żadna bariera nie może być findingiem; patrz *Seen once*.

## 🔁 Seen once, not reported as a finding

Wszystkie pozycje `[SYNTHETIC]`, jeden przebieg, bez wagi i rozrzutu.

1. **Logowanie przed obejrzeniem mentorów przegrywa z darmową otwartą kartą (krok 1; D07, R05).** P01 i P02 odchodzą w S1. Jednym kliknięciem przez GitHub P01 zmienia decyzję (CONTINUE); P02 nadal odchodzi, z mniejszą niechęcią. Szybka reakcja: irytacja, umiarkowana (P01), łagodna (P02); wyzwalacz: ściana przed oglądaniem, gdy darmowa alternatywa jest otwarta. Krok 1 nie mówi, czy przeglądanie wymaga konta (brakujący przypadek, oboje). Transkrypty: `run-1-P01.md`, `run-1-P02.md`.
2. **Lista uporządkowana po dostępności nie daje sygnału kompetencji; link od zaufanej osoby go zastępuje (krok 2; D21).** P01 i P02 odchodzą w S2 i w obu przypadkach wraca CONTINUE przy linku od znajomego. P02 opiera się na swojej linii o ocenie po poleceniu lub po tym, co ktoś zrobił; u P01 troska o ocenę kompetencji nie ma własnej linii persony i część wynika z karty scenariusza, która mówiła o braku ocen (patrz notatki ankietera P01): ważyć ostrożnie.
3. **Próg dwóch godzin a moment, w którym pomoc się przydaje (krok 4; D22, R03; A04).** P01: przypadek (a), termin dziś: CONTINUE; (b), po wydaniu: odchodzi, intensywna frustracja; P02: (a) CONTINUE, (b) odchodzi, obojętnie. Dla P01 „within the hour" kłóci się z R03, ale znaczenie tej frazy nie jest ustalone (Open questions briefu). Zrozumienie P02 („pięć minut" kontra R03) to nieporozumienie persony (pięć minut dotyczyło znalezienia pomocnika) i nie jest wynikiem.
4. **Cena nieznana w chwili wyboru długości (krok 3; D09, R02; A02).** P01: CONTINUE ostrożnie, chce zobaczyć kwotę i mieć pewność, że nic nie jest pobrane przed potwierdzeniem; P02: odkłada. Płatnik nieznany obojgu (P01 „nie wiem", P02 „nie wiem, jak wygląda akceptacja wydatku").
5. **Przekazanie kodu w sesji tekstowej nie jest opisane (krok 5; D27, R04).** P01: CONTINUE z wątpliwością; P02: odkłada, a przy pytaniu na dwa zdania bez kodu przechodzi na CONTINUE. Brakujący przypadek: wklejanie plików, więcej niż mieści się w czacie, koniec 25 lub 50 minut.
6. **Brakujące przypadki, po jednej personie:** brak terminu przed potrzebą (P01); problem większy niż sesja (P01); opłata, gdy mentor nie pomoże (P01; płatności są poza zakresem briefu); akceptacja wydatku przez firmę (P02); sprawdzenie, czy mentor zna dokładny stos (P01, P02).

## 🔍 Outliers

**P02 (run 1): temat prawie nie obchodzi.** Rozwiązał problem sam, ma wewnętrzny kanał, nigdy nie płacił osobie. W materiale jedyną drogą do zapłaty jest rzadka, jednorazowa sprawa na dzień pracy, znaleziony pomocnik w pięć minut, do godziny, na firmę. Ta persona odchodzi lub odkłada w czterech z pięciu presji (S1, S2, S3, S5); w S4(a) przy terminie dziś wybiera CONTINUE. Dla A02 to najostrzejszy sygnał panelu, ale to jeden głos z jednej notatki, więc zostaje tutaj jako pytanie.

## 🧪 To confirm with real users

Liczba wierszy (6) nie równa się liczbie findingów (0): każda pozycja *Seen once* ma sprawdzenie, ale żadna jeszcze nie jest findingiem.

| # | Hypothesis `[SYNTHETIC]` | Persona ids / runs | Settles | Who to recruit | How |
|---|---|---|---|---|---|
| 1 | Persona porzuciłaby obejrzenie listy mentorów za ścianą logowania, gdy ma otwartą darmową alternatywę | P01, P02 / run 1 | D07, R05; pośrednio A02 | deweloper, który w ostatnim miesiącu szukał pomocy poza zespołem | „Opowiedz o ostatnim razie, gdy musiałeś się gdzieś zalogować, żeby dostać pomoc; co zrobiłeś?"; test użyteczności: lista przed logowaniem a po |
| 2 | Lista bez sygnału kompetencji zatrzymuje wybór; zaufany link go zastępuje | P01, P02 / run 1 | D21; A02 | deweloperzy po pilnym blokerze i po niepilnym | „Skąd wiedziałeś ostatnio, że obcy zna problem?"; dane: jak mentorzy dzielą się linkami |
| 3 | Dwie godziny mijają się z momentem, w którym odpowiedź jeszcze się przydaje | P01, P02 / run 1 | A04, D22, R03 | deweloper z blokerem przed wydaniem | „Na kiedy musiała nadejść ostatnia odpowiedź?"; zapytać, co znaczy „within the hour" w godzinach; dane z D22 (czas rezerwacji do startu) |
| 4 | Brak ceny i płatnika w chwili wyboru wstrzymuje decyzję | P01, P02 / run 1 | A02, D09, R02 | deweloper i jego przełożony lub osoba zatwierdzająca wydatek | „Kto zapłacił ostatnio za zewnętrzną pomoc i jak to zatwierdzono?" |
| 5 | Niejasne przekazanie kodu w sesji tekstowej wstrzymuje wybór | P01, P02 / run 1 | D27, R04 | deweloper z konfiguracją lub kodem w repozytorium | test użyteczności ekranu sesji z zadaniem „pokaż mentorowi swój problem" |
| 6 | Deweloper bez presji i z kanałem wewnętrznym płaci tylko za rzadką sprawę jednorazową, na firmę | P02 / run 1 | A02 | deweloper w dużej firmie z wewnętrznym kanałem | „Kiedy ostatnio firma zapłaciła za zewnętrzną pomoc?"; ile razy w roku |

## 📝 Interviews

Transkrypty: `transcripts/run-1-P01.md`, `transcripts/run-1-P02.md`.
Acquiescence: z czterech pytań tak/nie 6 odpowiedzi udzielono: 3 tak (P01 Y1, Y3; P02 Y3), 3 nie; 2 odpowiedzi „brak podstaw" (Y4 obu) liczone osobno jako luka materiału. Udział „tak" nie przekracza połowy. Y3 miało inne brzmienie dla P01 i P02, więc odpowiedzi nie są wprost porównywalne.
Pytania o deklarowaną preferencję: brak.

## 🔍 Parity with real interviews

Odłożona notatka: `holdout/2026-09-01-interview-backend-dev-fintech.md`, otwarta dopiero po ustaleniu person i transkryptów. 13 tematów realnych, 9 wspólnych, więc nakładanie 9 z 13 (wpis w `calibration.md`; to punkt trendu, nie wynik).
- **Wspólne:** pilny bloker przed wydaniem bez pomocy w firmie; zewnętrzna społeczność odpowiedziała źle lub sprzecznie; potrzeba szybkości (ogólnikowo: realnie dwadzieścia minut, panel „within the hour"); tarcie przy zakładaniu konta przed pomocą; cena niejasna, płatnik nierozstrzygnięty; wcześniejsza płatna pomoc zawiodła (ogólnikowo: tam Codementor, tu kurs); tekst wystarcza, a wklejanie kodu to pytanie; zaufanie do kogoś, kto robił to samo (ogólnikowo, tylko P02); brak potrzeby zapisanych odpowiedzi, subskrypcji, platformy.
- **Tylko realne (ślepe punkty panelu):** booking dłuższy niż około pięciu minut oznacza rollback i wyjście; oceny nie mają wartości („każdy ma pięć gwiazdek"); wklejanie produkcyjnego YAML-a obcemu; koszt społeczny opóźnienia wydania. Materiał do zebrania: persony z linią o poufności kodu i o budżecie czasu na samą rezerwację.
- **Sentyment:** zgodny co do szybkości, tekstu, braku subskrypcji i tarcia przy koncie. Rozbieżny przy ocenach: realny rozmówca uważa je za bezwartościowe, a panel narzekał na brak sygnału jakości; po stronie panelu część wynikała z karty scenariusza (patrz notatki ankietera P01).
- **Tylko panel (pytania do kolejnej realnej rozmowy, nie findingi):** czy logowanie jednym kliknięciem przez GitHub zmienia decyzję; czy lista według dostępności mówi cokolwiek o kompetencji; czy filtr jest dość szczegółowy dla konkretnego problemu; co z opłatą, gdy mentor nie pomoże; problem większy niż 25 lub 50 minut; akceptacja wydatku w firmie.

## Quality gate

Krytyczne punkty 1, 2, 5, 9, 10, 11, 12, 15, 16: spełnione. Persony mają źródła, bez imion i demografii; brak pytań o preferencję; brak findingów z jednego przebiegu (pozycje w *Seen once*, każda z `[SYNTHETIC]` i sprawdzeniem); brak liczb z person; język „would", bez „validated"; parity tylko z odłożoną notatką, zapis w `calibration.md`; acquiescence zmierzone. Uwagi: panel ma tylko dwie persony i oboje podnoszą ten sam zestaw problemów (brak sygnału jakości, ściana logowania, kod, cena), a to może być częściowo efekt tego samego opisu kroków; przy tym panelu nie ma dowodu rozproszenia. Przesunięcie pozytywne nie wystąpiło: obie persony odmawiały w części presji. Dodatkowo nie wykonano części punktów 6 i 8 w trybie pytanie po pytaniu (opis w Scope and limits). Punkt 14 sprawdzony: P01 raz proponuje „darmową kartę" jako powód zostania, P02 kanał wewnętrzny; różne narzędzia.

## 📸 Evidence

Przejście narracyjne, brak ekranów.
