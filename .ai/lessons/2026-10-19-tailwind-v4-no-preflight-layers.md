---
date: 2026-10-19
topic: Tailwind v4 w istniejącej aplikacji bez zmiany wyglądu
status: active
---

# Tailwind v4 dodany do istniejących stylów: bez preflight i z warstwami

## Kontekst
Aplikacja miała własny, nielayerowany `globals.css`. `@import "tailwindcss"` dołożyłoby preflight (reset nagłówków,
list, obrazów), a nielayerowane style zawsze wygrywają z utility z `@layer utilities`.

## Czego się nauczyliśmy
- Importuj osobno `tailwindcss/theme.css` i `tailwindcss/utilities.css`; preflight pomiń, jeśli aplikacja ma własny reset.
- Deklaracja `@layer theme, base, components, utilities;` + stare style w `@layer base` daje utility pierwszeństwo.
- Pakiet współdzielony (`ui`) leży poza katalogiem aplikacji, więc Tailwind go nie skanuje — potrzebny `@source`.
- Zmianę w CSS można zweryfikować bez przeglądarki: porównać reguły skompilowanego CSS sprzed i po zmianie.

## Jak to stosować
Tokeny projektu trzymaj w `packages/ui/src/styles/index.css`, a w `globals.css` aplikacji tylko importuj. Nowe klasy
w komponentach `ui` są wykrywane dzięki `@source "../../../ui/src"` w `packages/app/src/app/globals.css`.
