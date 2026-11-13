# MENTORSHIP-001: Publikacja profilu wymaga wybranej technologii

**Implementation:** [TypeScript test](../../../packages/app/e2e/app.e2e.test.ts)

## Cel
Mentor nie może opublikować profilu bez wskazania co najmniej jednej technologii, w której się specjalizuje.

## Scenariusz
Given zalogowany mentor nie ma jeszcze profilu mentora
When otwiera „My profile”, wybiera „Edit mentor profile”, wypełnia wymagane dane, zaznacza publikację i zapisuje formularz bez wyboru technologii
Then formularz pokazuje błąd przy technologiach, profil pozostaje nieopublikowany i mentor może nadal uzupełnić formularz

## Dane i izolacja
Test tworzy konto mentora i zaakceptowane zaproszenie w dedykowanej bazie `devmentor_e2e`, loguje konto przez API i używa UI dla ścieżki profilu. Baza jest czyszczona przed scenariuszem i po nim. Żadne wspólne konto ani dane demonstracyjne nie są wymagane.
