# TERMS-003: Utworzenie legal hold wymaga powodu

**Implementation:** [TypeScript test](../../../packages/app/e2e/app.e2e.test.ts)

## Cel
Zapobiec tworzeniu nieaudytowalnych legal holds bez uzasadnienia operatora.

## Scenariusz
Given skonfigurowany operator z prawidłową sesją
When wysyła żądanie utworzenia hold z pustym powodem
Then API zwraca błąd walidacji i nie tworzy hold

## Dane i izolacja
Test korzysta z operatora fixture skonfigurowanego tylko w procesie E2E. Walidacja pustego powodu kończy żądanie przed sprawdzeniem rekordu, więc test nie tworzy ani nie modyfikuje danych retencji.
