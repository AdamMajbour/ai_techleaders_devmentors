# TERMS-002: Odmowa dostępu do legal holds dla seekera

**Implementation:** [TypeScript test](../../../packages/app/e2e/app.e2e.test.ts)

## Cel
Potwierdzić, że dane o legal holds są dostępne wyłącznie dla skonfigurowanego operatora.

## Scenariusz
Given seeker z własną, prawidłową sesją
When pobiera operatorską listę legal holds
Then API odmawia dostępu kodem 403

## Dane i izolacja
Test tworzy niezależne konto seeker przez API rejestracji. Żaden legal hold nie jest tworzony ani zmieniany.
