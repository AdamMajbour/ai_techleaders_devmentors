@AGENTS.md

---

# Instrukcje dla Claude i AI — korzystanie ze struktury .ai/

## Czytaj AGENTS.md zawsze

AGENTS.md zawiera:
- Dokumentację struktury katalogów `.ai/`
- Best Practices z wskazówkami Borisa Cherny'ego
- Wszystkie obowiązkowe zasady dla pracy z tym projektem

**Zanim zaczniesz pracę:** przejrzyj AGENTS.md, zwłaszcza sekcję "Best Practices".

## Ogólne zasady

1. **Czytaj AGENTS.md** — zawiera szczegółową dokumentację struktury `.ai/` i Best Practices
2. **Respektuj konwencje nazewnictwa** — wszystkie pliki muszą mieć format `YYYY-MM-DD-slug.md`
3. **Organizuj wiedzę** — skorzystaj ze struktur `.ai/specs/`, `.ai/runs/` i `.ai/lessons/` do zbierania i organizowania informacji
4. **Stosuj Best Practices** — szczególnie planowanie, weryfikacja i zapisywanie wniosków

## Kiedy tworzyć pliki w `.ai/specs/`

- Tworzysz nową specyfikację projektową lub SDD
- Planujesz znaczący refactor lub zmianę architekturalną
- Definiujesz nowy system lub komponent wymagający dokumentacji
- **Instrukcja:** Utwórz plik `YYYY-MM-DD-slug.md` w `.ai/specs/` z pełną specyfikacją

## Kiedy tworzyć pliki w `.ai/runs/`

- Prowadzisz autonomiczny przebieg (np. optymalizacja, debugowanie, analiza)
- Wykonujesz iteracyjne eksperymenty wymagające śledzenia
- Chcesz udokumentować decyzje podjęte w trakcie pracy
- **Instrukcja:** Utwórz log `YYYY-MM-DD-slug.md` w `.ai/runs/` z celem, metodą, wynikami i wnioskami

## Kiedy tworzyć pliki w `.ai/lessons/`

- Naprawiłeś trudny bug — dokumentuj root cause i rozwiązanie
- Odkryłeś ważny wzorzec projektowy lub best practice
- Nauczyłeś się czegoś nieoczywistego o systemie
- Chcesz zachować długoterminową wiedzę dla zespołu
- **Instrukcja:** 
  1. Utwórz plik `YYYY-MM-DD-slug.md` w `.ai/lessons/`
  2. Zaktualizuj `.ai/lessons.md` z linkiem i krótkim opisem

## Przepływ dla implementacji specyfikacji

1. Utwórz specyfikację w `.ai/specs/` z formatem `YYYY-MM-DD-slug.md`
2. Implementuj według specyfikacji
3. Po zakończeniu: przenieś plik do `.ai/specs/implemented/`
4. Jeśli nauczyłeś się czegoś ważnego → utwórz wpis w `.ai/lessons/`
5. Jeśli było wiele iteracji → utwórz log w `.ai/runs/`

## Archiwizowanie

- Gdy specyfikacja jest przestarzała lub nigdy nie będzie wdrożona → przenieś do `.ai/specs/archive/`
- Nigdy nie usuwaj plików — zawsze archiwizuj
- Staré wpisy w `.ai/lessons/` mogą pozostać, ale oznacz je jako `[ARCHIVED]` jeśli są nieaktualne
