# Tworzenie wydania

1. Scal zmiany przeznaczone do wydania do `main`.
2. Opcjonalnie dodaj na początku `CHANGELOG.md` datowany wpis dla kolejnego wydania w formacie `## [1.0.2] - YYYY-MM-DD`, z sekcjami i opisem zmian. Jeśli go nie ma, notatki zostaną zbudowane z commitów od ostatniego taga.
3. Otwórz repozytorium na GitHubie, przejdź do **Actions → Release → Run workflow**.
4. Wybierz `main`, rodzaj wersji (`patch`, `minor`, `major` albo `custom`), a dla `custom` podaj pełny stabilny numer SemVer większy od obecnego.
5. Uruchom workflow i sprawdź wynik w **Releases**.

Workflow przyjmuje uruchomienie wyłącznie z `main`. Tworzy tag `vX.Y.Z` na bieżącym `main` i publikuje GitHub Release z notatkami z changeloga albo commitów od poprzedniego taga. Kolejny numer bazuje na najnowszym stabilnym tagu; jeśli tagów nie ma, używa wersji z głównego `package.json`. Jeśli tag istnieje, ale poprzedni przebieg nie zdążył opublikować Release, akcja wznowi publikację tego taga. Workflow nie wypycha commitów do chronionej gałęzi `main`.
