# vault-002: Odpowiedź jest ukryta przed innym seekerem

**Implementation:** [TypeScript test](../../../packages/app/e2e/app.e2e.test.ts)

## Cel
Sprawdzić, czy zalogowany seeker, który nie kupił odpowiedzi, nie może odczytać jej przez API.

## Scenariusz
Given jeden seeker kupił odpowiedź vault wygenerowaną z opublikowanej notatki mentora
When inny zalogowany seeker pobiera tę odpowiedź
Then API zwraca 404 i nie ujawnia treści odpowiedzi

## Dane i izolacja
Test tworzy dwóch seekerów, mentora, notatkę i zakup w izolowanej bazie E2E. Zakup przechodzi przez lokalny mock checkout; baza jest czyszczona przez istniejący harness.
