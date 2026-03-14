$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$packageJsonPath = Join-Path $workspaceRoot 'package.json'
$package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

function Resolve-AppExePath {
  param(
    [string]$Root,
    [object]$Pkg
  )

  $releaseDir = Join-Path $Root 'release\win-unpacked'
  if (-not (Test-Path $releaseDir)) {
    throw "Packaged output folder not found: $releaseDir"
  }

  if ($env:SMOKE_EXE_PATH) {
    $overridePath = $env:SMOKE_EXE_PATH
    if (-not [System.IO.Path]::IsPathRooted($overridePath)) {
      $overridePath = Join-Path $Root $overridePath
    }
    if (Test-Path $overridePath) {
      return (Resolve-Path $overridePath).Path
    }
    throw "SMOKE_EXE_PATH was provided but not found: $overridePath"
  }

  $candidateNames = @()
  if ($Pkg.build -and $Pkg.build.win -and $Pkg.build.win.executableName) {
    $candidateNames += [string]$Pkg.build.win.executableName
  }
  if ($Pkg.build -and $Pkg.build.productName) {
    $candidateNames += [string]$Pkg.build.productName
  }
  if ($Pkg.productName) {
    $candidateNames += [string]$Pkg.productName
  }
  if ($Pkg.name) {
    $candidateNames += [string]$Pkg.name
  }

  foreach ($name in ($candidateNames | Select-Object -Unique)) {
    $path = Join-Path $releaseDir ("$name.exe")
    if (Test-Path $path) {
      return (Resolve-Path $path).Path
    }
  }

  $helperExeNames = @('crashpad_handler', 'elevate', 'notification_helper')
  $candidates = Get-ChildItem -Path $releaseDir -Filter '*.exe' -File |
    Where-Object { $helperExeNames -notcontains $_.BaseName.ToLowerInvariant() } |
    Sort-Object -Property Length -Descending

  if (-not $candidates -or $candidates.Count -eq 0) {
    throw "No suitable executable found in $releaseDir"
  }

  return $candidates[0].FullName
}

$exePath = Resolve-AppExePath -Root $workspaceRoot -Pkg $package

$profileRoot = Join-Path $workspaceRoot '.context\.smoke-profile'
if (Test-Path $profileRoot) {
  Remove-Item -Path $profileRoot -Recurse -Force -ErrorAction SilentlyContinue
  if (Test-Path $profileRoot) {
    Write-Host "Warning: Could not fully delete .smoke-profile due to file locks."
  }
}
New-Item -ItemType Directory -Path $profileRoot -Force | Out-Null
$smokeUserDataDir = Join-Path $profileRoot $package.name
New-Item -ItemType Directory -Path $smokeUserDataDir -Force | Out-Null

$previousAppData = $env:APPDATA
$previousLocalAppData = $env:LOCALAPPDATA
$previousUserDataDir = $env:APP_USER_DATA_DIR
$env:APPDATA = $profileRoot
$env:LOCALAPPDATA = $profileRoot
$env:APP_USER_DATA_DIR = $smokeUserDataDir

$start = Get-Date
try {
  $process = Start-Process -FilePath $exePath -PassThru
  Start-Sleep -Seconds 8

  if ($process.HasExited) {
    throw "Smoke test failed: packaged app exited early with code $($process.ExitCode)."
  }

  $appDataDir = $smokeUserDataDir
  $dbPath = Join-Path $appDataDir 'app.db'
  $dbExists = Test-Path $dbPath
  
  $appName = (Get-Item $exePath).BaseName
  if (-not $dbExists) {
    Get-Process -Name $appName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    throw "Smoke test failed: database file not found at $dbPath"
  }

  Get-Process -Name $appName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
finally {
  $env:APPDATA = $previousAppData
  $env:LOCALAPPDATA = $previousLocalAppData
  $env:APP_USER_DATA_DIR = $previousUserDataDir
}

$evidenceDir = Join-Path $workspaceRoot '.context'
if (-not (Test-Path $evidenceDir)) {
  New-Item -ItemType Directory -Path $evidenceDir | Out-Null
}

$evidencePath = Join-Path $evidenceDir 'VERIFY_WIN.md'
@"
# verify:win evidence
- command: pnpm run verify:win
- result: PASS
- timestamp: $($start.ToString('s'))
- executable: $exePath
- db_path: $dbPath
- db_exists: $dbExists
- note: This smoke test verifies launch + process health + database creation only.
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Smoke test passed. Evidence written to $evidencePath"
