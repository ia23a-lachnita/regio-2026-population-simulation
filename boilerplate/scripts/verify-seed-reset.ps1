param(
  [string]$DbPath,
  [string]$ProfileRoot,
  [string]$UserDataDir
)

$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$package = Get-Content (Join-Path $workspaceRoot 'package.json') -Raw | ConvertFrom-Json

$productFolderName = if ($package.build -and $package.build.productName) {
  [string]$package.build.productName
} elseif ($package.productName) {
  [string]$package.productName
} elseif ($package.name) {
  [string]$package.name
} else {
  'app'
}

if (-not $ProfileRoot) {
  $ProfileRoot = Join-Path $workspaceRoot '.context\.db-reset-profile'
}

if (-not $UserDataDir) {
  $UserDataDir = Join-Path $ProfileRoot $productFolderName
}

if (-not $DbPath) {
  $DbPath = Join-Path $UserDataDir 'app.db'
}

if (-not (Test-Path $DbPath)) {
  throw "Seed verification failed. Expected database file not found at $DbPath"
}

$contextDir = Join-Path $workspaceRoot '.context'
if (-not (Test-Path $contextDir)) {
  New-Item -ItemType Directory -Path $contextDir | Out-Null
}

$contractPath = Join-Path $contextDir 'SEED_CONTRACT.json'
$jsonEvidencePath = Join-Path $contextDir 'DB_RESET.json'
$mdEvidencePath = Join-Path $contextDir 'DB_RESET.md'

if (-not (Test-Path $contractPath)) {
  throw "Seed verification failed. Missing seed contract: $contractPath"
}

if (-not (Test-Path $jsonEvidencePath)) {
  throw "Seed verification failed. Missing JSON evidence: $jsonEvidencePath"
}

$verification = Get-Content $jsonEvidencePath -Raw | ConvertFrom-Json
if ($verification.result -ne 'PASS') {
  throw 'Seed verification failed. Row-level seed proof did not pass.'
}

if ($DbPath) {
  $expectedDbPath = [System.IO.Path]::GetFullPath($DbPath)
  $actualDbPath = [System.IO.Path]::GetFullPath([string]$verification.db_path)
  if ($expectedDbPath -ne $actualDbPath) {
    throw "Seed verification failed. Evidence DB path '$actualDbPath' did not match expected '$expectedDbPath'."
  }
}

$tableLines = (($verification.required_tables | ForEach-Object {
  $samples = if ($_.sample_values -and @($_.sample_values).Count -gt 0) {
    (@($_.sample_values) -join ', ')
  } else {
    'none'
  }

  "- table: $($_.table) | min_rows: $($_.min_rows) | actual_rows: $($_.actual_rows) | passed: $($_.passed) | sample_values: $samples"
}) -join "`n")

@"
# db:reset evidence
- command: pnpm run db:reset
- result: $($verification.result)
- contract: $contractPath
- database: $DbPath

## Required tables
$tableLines
"@ | Set-Content -Path $mdEvidencePath -Encoding UTF8

Write-Host "Seed verification passed. Evidence written to $jsonEvidencePath and $mdEvidencePath"