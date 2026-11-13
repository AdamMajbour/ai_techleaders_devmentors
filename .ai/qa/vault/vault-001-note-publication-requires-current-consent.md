# vault-001: Publikacja notatki wymaga aktualnej zgody

**Implementation:** [TypeScript test](../../../packages/app/e2e/app.e2e.test.ts)

## Cel
Upewnić się, że mentor nie opublikuje notatki bez zgody ani na podstawie nieaktualnej wersji informacji o wykorzystaniu treści.

## Scenariusz
Given mentor utworzył roboczą notatkę
When próbuje opublikować ją bez zgody lub z nieaktualną wersją informacji
Then API odrzuca każdą próbę, a notatka pozostaje w stanie draft

## Dane i izolacja
Test tworzy osobne konto mentora i notatkę w odizolowanej bazie E2E. Baza jest czyszczona przez istniejący harness po przebiegu.
