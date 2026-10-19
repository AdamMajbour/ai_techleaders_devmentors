---
date: 2026-10-19
topic: hooki React w pakiecie core
status: active
---

# Hooki React w barrelu `core` psują import z kodu serwerowego

## Kontekst
`@devmentor/core` re-eksportował hooki (`useState`) razem z utilami i stałymi. Import `HTTP_STATUS`
w route handlerze Next.js kończył się błędem "importing a module that depends on `useState` into a React Server Component".

## Czego się nauczyliśmy
Root pakietu, który ma być niezależny od frameworka, nie może ciągnąć Reacta. Hooki trafiają do osobnego entry pointu.

## Jak to stosować
Hooki z core: `import { useAsync } from '@devmentor/core/hooks'` (plik ma `'use client'`).
Root `@devmentor/core` zawiera tylko types/utils/constants. `@devmentor/db` importuj wyłącznie w kodzie serwerowym.
