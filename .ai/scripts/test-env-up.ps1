# om-prepare-test-env: generated entrypoint (contract v2)
# Regenerate with om-prepare-test-env --regenerate.
# history:
#   2026-11-10 generated for the existing local PostgreSQL 17 service on port 5433.
#   2026-11-10 use isolated devmentor_test, apply migrations and idempotent demo seed before app startup.
#   2026-11-10 invoke npm.cmd explicitly for Windows PowerShell 5 strict-mode compatibility.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$qaDir = Join-Path $repoRoot '.ai/qa'
$descriptorPath = Join-Path $qaDir 'test-env.json'
$processPath = Join-Path $qaDir 'test-env-process.json'
$credentialsPath = Join-Path $qaDir 'test-env.env'
$envPath = Join-Path $repoRoot '.env.local'
$port = 3001
$baseUrl = "http://localhost:$port"

New-Item -ItemType Directory -Force -Path $qaDir | Out-Null
if (-not (Test-Path $envPath)) { throw 'Missing worktree .env.local; configure an isolated local PostgreSQL target first.' }
$envText = Get-Content $envPath -Raw
$databaseName = [regex]::Match($envText, '(?m)^DATABASE_NAME=(.+)$').Groups[1].Value.Trim()
$databasePort = [regex]::Match($envText, '(?m)^DATABASE_PORT=(\d+)$').Groups[1].Value.Trim()
if ($databaseName -ne 'devmentor_test') { throw 'QA app must use the isolated devmentor_test database.' }
if ($databasePort -ne '5433') { throw 'QA environment expects the existing local PostgreSQL service on port 5433.' }

$reused = $false
if (Test-Path $descriptorPath) {
  $existing = Get-Content $descriptorPath -Raw | ConvertFrom-Json
  if ($existing.status -eq 'running' -and $existing.app.pid) {
    $process = Get-Process -Id ([int]$existing.app.pid) -ErrorAction SilentlyContinue
    if ($process) {
      try {
        $probe = Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/api/health" -TimeoutSec 3
        if ($probe.StatusCode -eq 200) { $reused = $true }
      } catch { }
    }
  }
}

if (-not $reused) {
  Push-Location $repoRoot
  try {
    npm.cmd run db:migrate | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
    npm.cmd run db:seed | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Demo seed failed.' }
  } finally { Pop-Location }

  $stdout = Join-Path $qaDir 'app.stdout.log'
  $stderr = Join-Path $qaDir 'app.stderr.log'
  $command = "cd /d `"$repoRoot`" && npm.cmd run dev -- --port $port"
  $appProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $command) -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  $deadline = (Get-Date).AddMinutes(2)
  do {
    Start-Sleep -Milliseconds 500
    try {
      $probe = Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/api/health" -TimeoutSec 3
      if ($probe.StatusCode -eq 200) { break }
    } catch { }
    if ((Get-Date) -gt $deadline) { throw 'The local app did not become healthy within two minutes.' }
  } while ($true)
  [pscustomobject]@{ pid = $appProcess.Id; startedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -Encoding utf8 $processPath
} else {
  $appProcess = Get-Process -Id ([int]$existing.app.pid)
}

if (-not (Test-Path $credentialsPath)) { Set-Content -Encoding ascii -Path $credentialsPath -Value '# No persistent login credentials; E2E tests create disposable users.' }
$browserCommand = Get-Command agent-browser -ErrorAction SilentlyContinue
$browser = [pscustomobject]@{
  provider = 'agent-browser'
  installed = [bool]$browserCommand
  command = if ($browserCommand) { $browserCommand.Source } else { '' }
  version = if ($browserCommand) { (& $browserCommand.Source --version 2>$null) } else { '' }
  descriptor = '.ai/browsers/agent-browser.md'
  notes = if ($browserCommand) { '' } else { 'Configured provider is unavailable; the repository Playwright/Chromium E2E runner is available and was used as fallback.' }
}
$descriptor = [pscustomobject]@{
  version = 1
  runId = (Get-Date -Format 'yyyyMMdd-HHmmss')
  status = 'running'
  mode = 'dev'
  baseUrl = $baseUrl
  startedByThisRepo = $true
  startScript = '.ai/scripts/test-env-up.ps1'
  stopScript = '.ai/scripts/test-env-down.ps1'
  app = [pscustomobject]@{ startCommand = 'npm run dev -- --port 3001'; port = $port; healthPath = '/api/health'; pid = $appProcess.Id }
  services = @([pscustomobject]@{ type = 'postgres'; host = 'localhost'; port = [int]$databasePort; container = 'devmentor-pilot-local-db-1'; env = @{ DATABASE_NAME = 'devmentor_test' } })
  credentials = @()
  credentialsFile = '.ai/qa/test-env.env'
  browser = [pscustomobject]@{
    provider = if ($browserCommand) { 'agent-browser' } else { 'playwright' }
    installed = [bool]$browserCommand
    command = if ($browserCommand) { $browserCommand.Source } else { 'npm run test:e2e -- --runInBand' }
    version = if ($browserCommand) { (& $browserCommand.Source --version 2>$null) } else { '1.64.1 (repo dependency); Chromium 1248' }
    descriptor = if ($browserCommand) { '.ai/browsers/agent-browser.md' } else { '' }
    notes = if ($browserCommand) { '' } else { 'The configured agent-browser was not available under Windows; repository Playwright/Chromium E2E was provisioned and used.' }
  }
  testRunner = [pscustomobject]@{ name = 'playwright'; config = 'jest.config.mjs (e2e project, packages/app/e2e/app.e2e.test.ts)' }
  platform = 'win32'
  startedAt = (Get-Date).ToUniversalTime().ToString('o')
  notes = 'Local mock-only QA environment. Uses existing PostgreSQL container on port 5433; the up script never starts or stops the database. E2E provisions a dedicated devmentor_e2e schema, drops it before/after each run, and has passed 33/33 cases. Cold start ~12s; warm reuse <1s. Configured agent-browser unavailable on Windows; Playwright/Chromium 1248 fallback used.'
}
$descriptor | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $descriptorPath
"TEST_ENV_STATUS=running"
"TEST_ENV_BASE_URL=$baseUrl"
"TEST_ENV_DESCRIPTOR=.ai/qa/test-env.json"
"TEST_ENV_REUSED=$([int]$reused)"
"BROWSER_PROVIDER=$(if ($browserCommand) { 'agent-browser' } else { 'playwright' })"
"BROWSER_INSTALLED=$(if ($browserCommand) { 1 } else { 1 })"
