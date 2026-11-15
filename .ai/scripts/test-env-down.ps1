# Stops only the local app process tree recorded by test-env-up.ps1. The PostgreSQL container is shared and is never stopped here.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$descriptorPath = Join-Path $repoRoot '.ai/qa/test-env.json'
if (-not (Test-Path $descriptorPath)) { exit 0 }
$descriptor = Get-Content $descriptorPath -Raw | ConvertFrom-Json
if ($descriptor.status -eq 'running' -and $descriptor.startedByThisRepo -and $descriptor.app.pid) {
  $pidToStop = [int]$descriptor.app.pid
  if (Get-Process -Id $pidToStop -ErrorAction SilentlyContinue) {
    & taskkill.exe /PID $pidToStop /T /F | Out-Null
  }
}
$descriptor.status = 'stopped'
$descriptor | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $descriptorPath
'TEST_ENV_STATUS=stopped'
