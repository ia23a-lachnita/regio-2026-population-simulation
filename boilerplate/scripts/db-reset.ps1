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

$env:NODE_ENV = 'production'
$env:SEED_DB = 'true'
$env:DB_INIT_ONLY = '1'
$env:APP_USER_DATA_DIR = $resetUserDataDir

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
}

$dbPath = Join-Path $resetUserDataDir 'app.db'
if (-not (Test-Path $dbPath)) {
  throw "db:reset failed. Expected database file not found at $dbPath"
}

$evidenceDir = Join-Path $workspaceRoot '.context'
if (-not (Test-Path $evidenceDir)) {
  New-Item -ItemType Directory -Path $evidenceDir | Out-Null
}

$evidencePath = Join-Path $evidenceDir 'DB_RESET.md'
@"
# db:reset evidence
- command: pnpm run db:reset
- result: PASS
- seed_enabled: true
- profile_root: $resetProfileRoot
- user_data_dir: $resetUserDataDir
- db_path: $dbPath
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "db:reset completed. Evidence written to $evidencePath"
