$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
foreach ($line in Get-Content (Join-Path $PSScriptRoot 'test-env.env')) {
  if ($line -match '^([^#=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
$env:NODE_ENV = 'development'
$env:PUBLIC_SIGNUP = 'false'
$env:AI_MODE = 'mock'
$env:MOCK_PAYMENT_E2E_ENABLED = 'true'
$env:VAULT_ENABLED = 'true'
$env:VAULT_PUBLISH_ENABLED = 'true'
Set-Location $repo
npm.cmd run start --workspace=@devmentor/app -- --hostname 127.0.0.1 --port 3001
