# Wynik testów mutacyjnych — AvailabilityService

**Data:** 2026-11-15  
**Moduł:** `packages/core/src/services/bookings/availability.service.ts`  
**Narzędzie:** StrykerJS 10.1.1  
**Test początkowy:** 8/8 testów zaliczonych  
**Wynik mutacji:** 105 mutantów; 57 zabitych; 48 przeżyło; mutation score 54,29%.

Uruchomienie ograniczono do testów `AvailabilityService`. Nie zmieniano ani nie commitowano kodu aplikacji. Przy konfiguracji Strykera pojawiło się nieblokujące ostrzeżenie o niepoprawnym HTML-u w raporcie QA.

| Plik i linia | Zmiana wprowadzona przez mutanta | Dlaczego testy go nie wykryły | Brakujący test | Ocena |
|---|---|---|---|---|
| `availability.service.ts:23` | Zmiana operatora `*` na `/` w stałej dwugodzinnego wyprzedzenia (3 mutanty) | Nie testowano `list`; mock repozytorium zwraca slot niezależnie od zakresu dat | Sprawdzić argumenty repozytorium, w tym dolną granicę `now + 2h` | Zmienia działanie |
| `availability.service.ts:25` | Zmiana mnożenia na dzielenie w granicy 15 minut | Istniejący zestaw nie wykrył tej zmiany granicy | Sprawdzić poprawny start np. 12:30 oraz niepoprawny poza granicą, np. 13:07 | Zmienia działanie |
| `availability.service.ts:47` | Pominięcie warunków widoczności profilu lub odwrócenie warunku akceptacji mentora (3 mutanty) | Jest test profilu niepublicznego, brak testów braku profilu i niezaakceptowanego mentora | Brak profilu; profil publiczny z niezaakceptowanym mentorem; brak wywołania repozytorium slotów | Zmienia działanie |
| `availability.service.ts:48` | Usunięcie tekstu `Mentor profile not found.` | Test sprawdza typ `NotFoundError`, nie treść komunikatu | Sprawdzić treść, jeśli stanowi kontrakt API | **Prawdopodobnie nie zmienia logiki**; zmienia tekst błędu |
| `availability.service.ts:53–54` | Zmiana `+` na `-` w granicach wyszukiwania slotów | Brak testu metody `list` i jej argumentów repozytorium | Zweryfikować zakres `[now + 2h, now + 7d]` | Zmienia działanie |
| `availability.service.ts:59–67` | Usunięcie całej implementacji `listOwn` | Metoda nie jest testowana | Sprawdzić autoryzację, zakres `[now, now + 7d]` i zwrócone DTO | Zmienia działanie |
| `availability.service.ts:65` | Zmiana `+` na `-` w górnej granicy `listOwn` | Brak testu `listOwn` | Zweryfikować górną granicę `now + 7d` | Zmienia działanie |
| `availability.service.ts:78` | Pominięcie kontroli wyrównania do kwadransa | Żaden z obecnych przypadków nie zabił tego wariantu | Start poza granicą 15 minut, np. 13:07 | Zmienia działanie |
| `availability.service.ts:79` | Zmiana `<` na `<=` przy minimalnym 30-minutowym wyprzedzeniu | Brak testu dokładnie na granicy | Start dokładnie 30 minut od `now` powinien być zaakceptowany | Zmienia działanie |
| `availability.service.ts:80` | Zmiana `>` na `>=` przy limicie 7 dni | Brak testu dokładnie na granicy | Slot kończący się dokładnie za 7 dni powinien być zaakceptowany | Zmienia działanie |
| `availability.service.ts:82` | Zmiana tekstu błędu walidacji | Testy sprawdzają typ `ValidationError`, nie tekst | Sprawdzić komunikat, jeśli jest kontraktem | **Prawdopodobnie nie zmienia logiki**; zmienia tekst błędu |
| `availability.service.ts:82–84` | Usunięcie lub zmiana `fieldErrors` | Testy nie sprawdzają szczegółów błędu pola | Sprawdzić `fieldErrors.startsAt` dla niepoprawnego wejścia | Zmienia kontrakt błędu |
| `availability.service.ts:94` | Pominięcie jednego z warunków mapujących konflikty repozytorium (kilka mutantów) | Testy nie symulują `StatusTransitionConflictError`, naruszenia unikalności ani ograniczenia wykluczającego | Osobny przypadek każdego rodzaju błędu, oczekujący `ConflictError` | Zmienia działanie |
| `availability.service.ts:95` | Zmiana tekstu konfliktu nakładającego się slotu | Brak asercji treści błędu | Sprawdzić tekst, jeśli jest kontraktem | **Prawdopodobnie nie zmienia logiki**; zmienia tekst błędu |
| `availability.service.ts:105` | Zmiana warunku braku slotu lub sprawdzania właściciela | Jest test cudzego slotu, ale brak testu nieistniejącego slotu | Brak slotu; właściciel slotu; w obu odmowach bez wywołania `cancelOpen` | Zmienia działanie |
| `availability.service.ts:105` | Zmiana tekstu `Availability slot not found.` | Test sprawdza typ błędu, nie treść | Sprawdzić treść, jeśli jest kontraktem | **Prawdopodobnie nie zmienia logiki**; zmienia tekst błędu |
| `availability.service.ts:106` | Zmiana statusu `open` na pusty tekst | Fixture ma zawsze status `open`; brak przypadku slotu zarezerwowanego | Slot o statusie innym niż `open` powoduje konflikt i nie wywołuje `cancelOpen` | Zmienia działanie |
| `availability.service.ts:106` | Zmiana tekstu błędu dla zarezerwowanego slotu | Brak asercji treści | Sprawdzić tekst, jeśli jest kontraktem | **Prawdopodobnie nie zmienia logiki**; zmienia tekst błędu |
| `availability.service.ts:107` | Zmiana obsługi wyniku `cancelOpen`, np. zawsze konflikt | Testowany jest wynik `false`, nie udane anulowanie | Wynik `true` zwraca `{ cancelled: true }` | Zmienia działanie |
| `availability.service.ts:108` | Usunięcie pola `cancelled` albo zmiana jego wartości na `false` | Brak testu udanego anulowania i wartości zwrotnej | Sprawdzić dokładny wynik `{ cancelled: true }` | Zmienia kontrakt odpowiedzi |
| `availability.service.ts:112,117` | Pominięcie kontroli sesji lub usunięcie optional chaining | Wszystkie testy przekazują poprawny `userId` | Brak sesji i sesja bez `userId` dają `UnauthorizedError`, bez wywołań repozytorium | Zmienia działanie |
| `availability.service.ts:113` | Pominięcie sprawdzenia członkostwa pilota | Mock zawsze zwraca `true` | Użytkownik spoza pilota dostaje `ForbiddenError` | Zmienia działanie |
| `availability.service.ts:118` | Pominięcie sprawdzenia zaakceptowanego mentora | Mock zawsze zwraca `true` | Niezaakceptowany mentor nie może tworzyć, listować własnych ani anulować slotów | Zmienia działanie |

Pozycje opisane jako prawdopodobnie niezmieniające logiki zmieniają wyłącznie treść komunikatów. Mogą nadal mieć znaczenie, jeśli klienci API lub UI traktują te komunikaty jako kontrakt.
