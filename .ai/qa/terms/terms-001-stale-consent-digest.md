# TERMS-001: Odrzucenie akceptacji z nieaktualnym digestem

**Implementation:** [TypeScript test](../../../packages/app/e2e/app.e2e.test.ts)

## Cel
Zapewnić, że uczestnik nie może zapisać akceptacji, jeśli skrót treści nie odpowiada opublikowanej wersji warunków.

## Scenariusz
Given nowy seeker jest zalogowany, a opublikowana wersja warunków ma aktualny digest
When wysyła akceptację z poprawnym identyfikatorem wersji i błędnym digestem
Then API zwraca konflikt, a historia akceptacji pozostaje pusta

## Dane i izolacja
Test rejestruje własnego seekera i korzysta z opublikowanych, oznaczonych jako fixture warunków w izolowanej bazie E2E. Nie współdzieli akceptacji z innymi testami.
