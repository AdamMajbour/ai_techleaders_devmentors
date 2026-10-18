# Portal Mentoringowy — wstępna koncepcja

Wstępna koncepcja portalu mentoringowego, inspirowanego sprawdzonymi funkcjami i przepływami **Preply.com**. Preply jest tu traktowany wyłącznie jako **benchmark funkcjonalny i UX** — identyfikacja wizualna, treści oraz kod serwisu nie są kopiowane ani odwzorowywane.

Projekt jest realizowany jako aplikacja Next.js i służy jako miejsce pracy nad koncepcją (dokumentacja + klikalne mockupy), a nie jako produkcyjna implementacja platformy.

## Zakres koncepcji

Zgodnie z przyjętym briefem, efektem prac ma być:

1. **Lista użytkowników systemu i ich potrzeb** — role (np. uczeń/student, mentor/korepetytor, administrator) wraz z ich celami i oczekiwaniami wobec platformy.
2. **Najważniejsze use case'y oraz kompletne przepływy użytkownika** — m.in. rejestracja, wyszukiwanie i dobór mentora, rezerwacja i realizacja lekcji, płatności, komunikacja, oceny i opinie.
3. **Mapa ekranów i nawigacji** — struktura aplikacji i relacje między ekranami dla poszczególnych ról.
4. **Specyfikacja każdego ekranu**, obejmująca:
   - cel ekranu,
   - dostępne funkcje,
   - komponenty UI,
   - stany: `loading`, `empty`, `error`, `success`,
   - walidacje,
   - powiązane endpointy API.
5. **Klikalne mockupy (HTML/CSS/TypeScript)** obejmujące wszystkie kluczowe ścieżki użytkownika.

> Status: koncepcja wstępna / work in progress. Powyższe elementy będą dodawane iteracyjnie (dokumentacja w repozytorium, mockupy jako osobne widoki aplikacji).

## Stack technologiczny

- [Next.js](https://nextjs.org) (App Router)
- React + TypeScript
- ESLint (konfiguracja projektu)

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000).

## Struktura repozytorium

```
src/app/   # strony i layouty aplikacji (Next.js App Router)
public/    # zasoby statyczne
```

## Uwaga dotycząca benchmarku

Preply.com służy wyłącznie jako punkt odniesienia dla sprawdzonych wzorców funkcjonalnych i przepływów UX w branży mentoringu/korepetycji. Wszystkie elementy wizualne, treściowe i implementacyjne tego projektu są tworzone niezależnie.
