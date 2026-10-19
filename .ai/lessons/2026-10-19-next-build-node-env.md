---
date: 2026-10-19
topic: next build i NODE_ENV
status: active
---

# `next build` pada przy `NODE_ENV=development`

## Kontekst
Po migracji do monorepo `npm run build` kończył się błędem prerenderu `/_global-error`
(`Cannot read properties of null (reading 'useContext')`) i masą ostrzeżeń o brakujących `key`.
Wyglądało to na zdublowany React między pakietami workspace.

## Czego się nauczyliśmy
Przyczyną było `NODE_ENV=development` ustawione w środowisku powłoki, a nie struktura monorepo
(`npm ls react` pokazuje jedną kopię Reacta). Next.js wymaga `NODE_ENV=production` przy `next build`.

## Jak to stosować
Buduj przez `NODE_ENV=production npm run build`. Przed szukaniem duplikatów Reacta sprawdź `echo $NODE_ENV`.

## Dalsze wymagane działania
Rozważyć ustawienie `NODE_ENV` w skrypcie `build` lub w CI.
