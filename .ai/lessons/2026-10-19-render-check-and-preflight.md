---
date: 2026-10-19
topic: sprawdzanie renderu w prawdziwej przeglądarce; Tailwind bez preflightu
status: active
---

# Zielone testy i poprawny CSS nie oznaczają poprawnego wyglądu

## Kontekst
Po fazach 1–4 wszystkie testy i buildy przechodziły, a CSS "wyglądał" poprawnie w porównaniu reguł. Dopiero zrzuty ekranu
z headless Chromium pokazały dwa błędy na `/ui-preview`.

## Czego się nauczyliśmy
- Bez preflightu Tailwinda natywne elementy zachowują style przeglądarki: `button` ma ramkę i szare tło, `h3`/`p` mają marginesy.
  Komponenty współdzielone muszą same je resetować (`border border-transparent bg-transparent`, `m-0`, `font-family: inherit`).
- Reguły pierwotnej strony bez zakresu (`main { text-align: center }`) wyciekają na nowe strony. Zawężaj je do klasy strony.
- Biblioteki Chromium można dostarczyć bez roota: pobrać paczki .deb z mirrora Debiana i rozpakować `dpkg -x` do katalogu
  w `LD_LIBRARY_PATH` (`scripts/setup-chromium-libs.py`).
- `npm audit --force` proponuje skoki major (a czasem obniżenie wersji) — nie stosować na ślepo. Krytyczną podatność w `next`
  naprawia zwykłe podniesienie wersji minorowej.

## Jak to stosować
Dla zmian UI uruchamiaj `npm run test:e2e` (obejmuje testy w Chromium) i oglądaj zrzuty ekranu. Po wymianie `node_modules`
zrestartuj serwer dev.
