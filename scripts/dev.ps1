# Load .env from repo root (simple KEY=VALUE parser)
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $pair = $_ -split '=', 2
    if ($pair.Length -eq 2) {
      $k = $pair[0].Trim()
      $v = $pair[1].Trim().Trim('"')
      [Environment]::SetEnvironmentVariable($k, $v, "Process")
    }
  }
}

$jwt = $env:JWT_SECRET
if (-not $jwt) { $jwt = "dev-jwt-secret-change-me"; $env:JWT_SECRET = $jwt }
$internal = $env:INTERNAL_API_KEY
if (-not $internal) { $internal = "dev-internal-key"; $env:INTERNAL_API_KEY = $internal }
$walletUrl = $env:WALLET_SERVICE_URL
if (-not $walletUrl) { $walletUrl = "http://localhost:3002"; $env:WALLET_SERVICE_URL = $walletUrl }

$db = $env:USER_DATABASE_URL
if (-not $db) {
  Write-Host "Set USER_DATABASE_URL, WALLET_DATABASE_URL, KYC_DATABASE_URL in .env"
  exit 1
}

$env:PORT = "3001"
$env:DATABASE_URL = $env:USER_DATABASE_URL
$env:RABBITMQ_URL = $env:RABBITMQ_URL
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd `"$root`"; `$env:PORT='3001'; `$env:DATABASE_URL=`$env:USER_DATABASE_URL; `$env:WALLET_SERVICE_URL=`$env:WALLET_SERVICE_URL; `$env:INTERNAL_API_KEY=`$env:INTERNAL_API_KEY; pnpm --filter @infiwallet/user-service dev"

Start-Sleep -Seconds 2
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd `"$root`"; `$env:PORT='3002'; `$env:DATABASE_URL=`$env:WALLET_DATABASE_URL; `$env:KYC_SERVICE_URL=`$env:KYC_SERVICE_URL; `$env:INTERNAL_API_KEY=`$env:INTERNAL_API_KEY; pnpm --filter @infiwallet/wallet-service dev"

Start-Sleep -Seconds 2
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd `"$root`"; `$env:PORT='3003'; `$env:DATABASE_URL=`$env:KYC_DATABASE_URL; pnpm --filter @infiwallet/kyc-service dev"

Start-Sleep -Seconds 2
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd `"$root`"; `$env:PORT='3018'; pnpm --filter @infiwallet/api-gateway dev"

Write-Host "Started user (3001), wallet (3002), kyc (3003), gateway (3018) in new windows."
