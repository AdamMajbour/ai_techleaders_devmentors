# Lekcja 16: SAST i DAST

Uruchomiono 2026-11-15 na lokalnym środowisku QA z `.ai/qa/test-env.json` (`http://127.0.0.1:3001`). Nie wysyłano żądań do hostów zewnętrznych. Semgrep czyta `packages/` tylko do odczytu; wszystkie artefakty tego ćwiczenia znajdują się tutaj.

## Wynik

**SAST (Semgrep Community Edition)** analizuje kod bez uruchamiania aplikacji i podaje pliki/reguły. Semgrep CE 1.185.0 został pobrany jako kontener `semgrep/semgrep:latest`; telemetria wyłączona przez `--metrics=off` oraz `DO_NOT_TRACK=1`. Próby skanowania `p/typescript`, `p/nextjs`, `p/owasp-top-ten` (łącznie), a potem samego `p/typescript` nie zakończyły się w tym Windows/Docker Desktop: proces `semgrep-core` pracował, lecz nie powstał plik JSON. Kontenery przerwano. **Brak wyników SAST nie oznacza braku problemów**; brak raportu uniemożliwia podanie lokalizacji w kodzie. Pierwsza instalacja pip na Pythonie 3.15 nie powiodła się przez brak wymaganego `pywin32==311` (repozytorium udostępniało 312).

**DAST (OWASP ZAP Baseline)** obserwuje działającą aplikację przez HTTP. Dockerowy `curl` potwierdził połączenie do `http://host.docker.internal:3001/api/health` (HTTP 200). ZAP 2.17.0 baseline zakończył skan i zapisał `zap-report.html` oraz `zap-report.json`. To pasywny skan: spider pobiera strony i pasywnie sprawdza odpowiedzi, nie wykonuje aktywnych ataków. Raport obejmuje lokalny dev server, który serwuje również skrypty Next.js/Turbopack; alerty z `_next/static` mogą dotyczyć bundla deweloperskiego, a nie kodu aplikacji.

Alerty ZAP z JSON (liczba instancji):

| Ryzyko ZAP | Znalezisko | URL przykładowej instancji | Dowód HTTP / szczegół |
|---|---|---|---|
| Medium (High) | Content Security Policy (CSP) Header Not Set | `http://host.docker.internal:3001` | Nagłówek `Content-Security-Policy` nieobecny; 4 instancje |
| Medium (Medium) | Missing Anti-clickjacking Header | `http://host.docker.internal:3001` | Brak `X-Frame-Options` lub równoważnej polityki CSP; 2 |
| Low (Medium) | X-Content-Type-Options Header Missing | URL-e assetów `/_next/static/...` | Brak `X-Content-Type-Options`; 5 |
| Low (Medium) | Server Leaks Information via X-Powered-By | `http://host.docker.internal:3001` | Odpowiedź zawiera `X-Powered-By: Next.js`; 4 |
| Low (Low) | Dangerous JS Functions | `/_next/static/chunks/node_modules_next_dist_compiled_react-server-dom-turbopack_...js` | Odpowiedź zawiera `eval(`; 2 |
| Low (Low) | Timestamp Disclosure - Unix | `/_next/static/chunks/1daa_next_dist_compiled_react-dom_cjs_react-dom-client_...js` | Odpowiedź zawiera `2080374784`; 1 |

Pełne adresy wszystkich instancji i pozostałe dowody są w JSON/HTML. ZAP zgłosił 14 kategorii (m.in. brak COEP/COOP/CORP i Permissions-Policy oraz informacyjne komentarze i zachowanie cache). Są to obserwacje odpowiedzi i nie wszystkie muszą oznaczać podatność w kodzie własnym.

**Porównanie:** ten przebieg dostarczył faktycznych znalezisk DAST, ale nie dostarczył wyników SAST. Dlatego nie ma uczciwego parowania alertów ZAP z lokalizacjami w kodzie Semgrep.

**Granice pokrycia:** baseline jest pasywny i nie sprawdza skutecznie wszystkich ścieżek, ról ani stanów aplikacji. Nie testuje poprawności autoryzacji ani własności rekordów. Nawet czyste skany nie dowodzą poprawnej autoryzacji. Brak logowania (lista credentials w konfiguracji QA jest pusta) oznacza, że obszary wymagające sesji mogą pozostać poza zasięgiem. Wyniki dotyczą wyłącznie uruchomionej konfiguracji deweloperskiej i nie są oceną produkcji.

## Polecenia do powtórzenia (PowerShell, katalog główny repo)

Semgrep (Community Edition z oficjalnego obrazu Docker; katalog repo montowany read-only; telemetria wyłączona):

```powershell
$env:DO_NOT_TRACK = '1'
docker run --rm -e DO_NOT_TRACK=1 -v "${PWD}:/src:ro" -v "${PWD}/.ai/qa/lesson-16-sast-dast:/out:rw" semgrep/semgrep:latest semgrep scan --metrics=off --config p/typescript --config p/nextjs --config p/owasp-top-ten --json --output /out/semgrep.json /src/packages
```

ZAP Baseline (wymaga działającego środowiska i routingu Docker Desktop do hosta):

```powershell
$envFile = '.ai/qa/test-env.json'
$baseUrl = (Get-Content $envFile -Raw | ConvertFrom-Json).baseUrl
$zapUrl = $baseUrl -replace '127\.0\.0\.1|localhost', 'host.docker.internal'
docker run --rm -v "${PWD}/.ai/qa/lesson-16-sast-dast:/zap/wrk/:rw" -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t $zapUrl -r zap-report.html -J zap-report.json
```

Raporty: [`zap-report.html`](zap-report.html), [`zap-report.json`](zap-report.json). Konfiguracja wygenerowana przez ZAP: [`zap.yaml`](zap.yaml). Raport HTML został otwarty w domyślnej przeglądarce.
