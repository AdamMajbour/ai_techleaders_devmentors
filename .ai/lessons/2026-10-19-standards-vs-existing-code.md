---
date: 2026-10-19
topic: wdrażanie standardów inżynierskich napisanych dla innego bootstrapu
status: active
---

# Standardy opisują zasady, nie dokładną strukturę plików

## Kontekst
`engineering-standards.md` odwoływał się do plików, których w repo nie ma (`admin/users`, `withScope`, `docs/product-scope.md`),
a część reguł wzajemnie się ograniczała (np. „core nie importuje ORM” vs serwisy w `core` używające `EntityManager`).

## Czego się nauczyliśmy
- Stosuj zasady do istniejącego kodu, a pliki bez odpowiednika i warstwy bez konsumenta odłóż (YAGNI zapisane w samym dokumencie).
- Konflikt „tylko `db` importuje ORM” i „serwisy w `core`” rozwiązuje repozytorium w `db` plus re-eksport samego typu `EntityManager`.
- Kontener DI w `core` wymusza dwa wejścia pakietu (izomorficzne i `/server`), inaczej klient ciągnie bazę przez barrel.
- Reguły granic pakietów mają sens tylko, gdy są egzekwowane: sprawdź `no-restricted-imports` próbnymi naruszeniami.
- Standard bezpieczeństwa potrafi unieważnić wcześniejszą funkcję: publiczne wyszukiwanie użytkownika po e-mailu zostało usunięte.

## Jak to stosować
Przy kolejnym konceptie zacznij od `.ai/specs/engineering-standards.md` sekcja 2, a brakujące warstwy (`makeCrudRoute`, `auth.ts`,
`CrudForm`, `DataTable`, zdarzenia) dodawaj z pierwszym konsumentem.
