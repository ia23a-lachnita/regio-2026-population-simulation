$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$packageJsonPath = Join-Path $workspaceRoot 'package.json'
$package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

$productFolderName = if ($package.build -and $package.build.productName) {
  [string]$package.build.productName
} elseif ($package.productName) {
  [string]$package.productName
} elseif ($package.name) {
  [string]$package.name
} else {
  'app'
}

$resetProfileRoot = Join-Path $workspaceRoot '.context\.db-reset-profile'
if (Test-Path $resetProfileRoot) {
  Remove-Item -Path $resetProfileRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $resetProfileRoot | Out-Null

$resetUserDataDir = Join-Path $resetProfileRoot $productFolderName
New-Item -ItemType Directory -Path $resetUserDataDir -Force | Out-Null

$previousNodeEnv = $env:NODE_ENV
$previousSeedDb = $env:SEED_DB
$previousInitOnly = $env:DB_INIT_ONLY
$previousUserData = $env:APP_USER_DATA_DIR
$previousSeedContractPath = $env:SEED_CONTRACT_PATH
$previousDbResetJsonPath = $env:DB_RESET_JSON_PATH

$env:NODE_ENV = 'production'
$env:SEED_DB = 'true'
$env:DB_INIT_ONLY = '1'
$env:APP_USER_DATA_DIR = $resetUserDataDir
$env:SEED_CONTRACT_PATH = Join-Path $workspaceRoot '.context\SEED_CONTRACT.json'
$env:DB_RESET_JSON_PATH = Join-Path $workspaceRoot '.context\DB_RESET.json'

Push-Location $workspaceRoot
try {
  $electronCmd = Join-Path $workspaceRoot 'node_modules\.bin\electron.cmd'
  if (-not (Test-Path $electronCmd)) {
    Write-Host "electron binary not found; installing workspace dependencies..."
    & pnpm install | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "Dependency install failed with exit code $LASTEXITCODE"
    }
  }

  & $electronCmd . | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "DB reset initialization failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
  $env:NODE_ENV = $previousNodeEnv
  $env:SEED_DB = $previousSeedDb
  $env:DB_INIT_ONLY = $previousInitOnly
  $env:APP_USER_DATA_DIR = $previousUserData
  $env:SEED_CONTRACT_PATH = $previousSeedContractPath
  $env:DB_RESET_JSON_PATH = $previousDbResetJsonPath
}

$dbPath = Join-Path $resetUserDataDir 'app.db'
if (-not (Test-Path $dbPath)) {
  throw "db:reset failed. Expected database file not found at $dbPath"
}

& (Join-Path $workspaceRoot 'scripts\verify-seed-reset.ps1') -DbPath $dbPath -ProfileRoot $resetProfileRoot -UserDataDir $resetUserDataDir

Write-Host 'db:reset completed. Row-level seed verification succeeded.'
