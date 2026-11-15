# Tworzenie wydania

1. Scal zmiany przeznaczone do wydania do `main`.
2. Dodaj na początku `CHANGELOG.md` datowany wpis dla kolejnego wydania w formacie `## [1.0.2] - YYYY-MM-DD`, z sekcjami i opisem zmian.
3. Otwórz repozytorium na GitHubie, przejdź do **Actions → Release → Run workflow**.
4. Wybierz `main`, rodzaj wersji (`patch`, `minor`, `major` albo `custom`), a dla `custom` podaj pełny stabilny numer SemVer większy od obecnego.
5. Uruchom workflow i sprawdź wynik w **Releases**.

Workflow przyjmuje uruchomienie wyłącznie z `main`. Weryfikuje wpis changeloga, wersje pakietów i lockfile oraz brak duplikatu taga. Następnie aktualizuje wersje, tworzy commit wydania i tag `vX.Y.Z`, po czym publikuje GitHub Release z notatkami z changeloga. Kolejny numer bazuje na najnowszym stabilnym tagu; jeśli tagów nie ma, używa wersji z głównego `package.json`.
