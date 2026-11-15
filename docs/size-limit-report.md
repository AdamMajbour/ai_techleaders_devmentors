# Pomiar rozmiaru stron po Brotli

**Data:** 2026-11-15  
**Build:** `npm run build` — zakończony poprawnie.  
**Narzędzie:** lokalne `size-limit` + `@size-limit/file` (`^14.3.0`).

Pomiar obejmuje skrypty JS i CSS przypisane przez manifesty Next.js do pierwszego załadowania każdej strony. Size Limit skompresował każdy plik algorytmem Brotli (jakość 11). Suma nie obejmuje HTML ani danych odpowiedzi serwera, więc jest to pomiar zasobów JS/CSS, a nie całego transferu przeglądarki.

| Strona | JS + CSS po Brotli | Największa paczka wspólna |
|---|---:|---|
| `/` | 105,4 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/login` | 105,8 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/register` | 105,0 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/sign-in` | 105,8 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/admin` | 102,9 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/articles` | 106,3 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/bookings/[id]` | 103,8 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/bookings/[id]/return` | 103,9 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/m/[slug]` | 108,2 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mentor` | 102,9 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mentor/availability` | 104,3 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mentor/bookings` | 104,1 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mentor/notes` | 107,5 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mentor/notes/new` | 107,5 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mentor/notes/[id]` | 107,5 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mentor/payouts` | 103,9 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mentor/previews` | 103,7 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mentor/profile` | 107,5 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mentors` | 104,0 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/operator` | 102,9 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/operator/approvals` | 104,3 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/operator/payouts` | 103,7 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/operator/pilot-metrics` | 104,0 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/operator/retention` | 104,2 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/operator/terms` | 104,0 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/operator/users` | 102,9 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/operator/vault-answers` | 103,6 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/profile` | 103,7 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/seeker` | 102,9 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/session-notes` | 103,9 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/terms` | 104,0 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/vault` | 103,9 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/vault/[id]` | 103,5 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/auth/verify` | 102,3 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mock-payment/checkout/[bookingId]` | 99,9 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/mock-payment/vault-checkout/[answerId]` | 99,8 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |
| `/ui-preview` | 99,1 KiB | `3j-9w2xinbu3b.js` — 73,5 KiB |

## Największe paczki i biblioteki

- `3j-9w2xinbu3b.js` — 73,5 KiB Brotli. To największy wspólny chunk z kodem widoków klienta aplikacji. Manifest wskazuje w nim moduły `lucide-react` i `next/link`, ale nie pozwala wiarygodnie rozdzielić rozmiaru chunku między te biblioteki.
- `0ihdhusfbb8b0.js` — 13,8 KiB Brotli, wspólny chunk.
- `11eatk73_qefk.js` — 7,1 KiB Brotli, współdzielony w trasach marketingowych.
- Większe chunki specyficzne dla widoków obejmują m.in. chunk logowania `2jdr4n7mxd00w.js` (8,4 KiB), weryfikacji `0qi4zcpl3de3k.js` (6,5 KiB) i artykułów `2s2s7rf3tgs1r.js` (3,4 KiB).

## Proponowane limity

Proponowane początkowe budżety na sumę JS + CSS po Brotli:

- Trasy marketingowe i mentorskie: **115 KiB** (obecne maksimum: 108,2 KiB).
- Logowanie i rejestracja: **110 KiB** (obecne maksimum: 105,8 KiB).
- Płatności, weryfikacja i pozostałe trasy: **110 KiB** (obecne maksimum: 102,3 KiB).

To daje umiarkowany zapas na rozwój i można je później zaostrzyć po zmniejszeniu współdzielonego JS. W konfiguracji Size Limit limity per trasa wymagają generowania listy plików z manifestów Next, ponieważ nazwy chunków są haszowane i współdzielone.

## Możliwości mniejszych importów

- `lucide-react` jest importowany nazwanymi ikonami, co pozwala tree-shakingowi usuwać nieużywane ikony. Sama zmiana ścieżki importu prawdopodobnie nie da dużej oszczędności; warto kontrolować, ile ikon trafia do wspólnych widoków.
- Większy potencjał ma ograniczenie kodu klienta współdzielonego przez wiele tras i ładowanie cięższych, rzadziej używanych komponentów dopiero wtedy, gdy są potrzebne.
- `next/link` jest częścią Next.js i nie jest dobrym kandydatem do dzielenia na mniejsze importy.

## Uwagi

Instalacja dodała `size-limit` i `@size-limit/file` do `devDependencies` oraz zmieniła lockfile. Pliki `package.json` i `package-lock.json` były już zmodyfikowane przed tym zadaniem; istniejące zmiany pozostały. Nie utworzono commita.
