$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$packageJsonPath = Join-Path $workspaceRoot 'package.json'
$package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

function Remove-PathIfExists {
  param([string]$PathToRemove)

  if (Test-Path -LiteralPath $PathToRemove) {
    Remove-Item -LiteralPath $PathToRemove -Recurse -Force
    Write-Host "Removed: $PathToRemove"
  }
}

$productFolderName = if ($package.build -and $package.build.productName) {
  [string]$package.build.productName
} elseif ($package.productName) {
  [string]$package.productName
} elseif ($package.name) {
  [string]$package.name
} else {
  'app'
}

$pathsToClean = @()

$workspaceSmokeProfile = Join-Path $workspaceRoot '.context\.smoke-profile'
$workspaceResetProfile = Join-Path $workspaceRoot '.context\.db-reset-profile'
$workspaceTempDb = Join-Path $workspaceRoot '.context\app.db'

$pathsToClean += $workspaceSmokeProfile
$pathsToClean += $workspaceResetProfile
$pathsToClean += $workspaceTempDb

if ($env:APPDATA) {
  $pathsToClean += (Join-Path $env:APPDATA $productFolderName)
}
if ($env:LOCALAPPDATA) {
  $pathsToClean += (Join-Path $env:LOCALAPPDATA $productFolderName)
}

$uniquePaths = $pathsToClean | Where-Object { $_ } | Select-Object -Unique

foreach ($targetPath in $uniquePaths) {
  $resolvedWorkspaceRoot = (Resolve-Path $workspaceRoot).Path
  $isWorkspacePath = $targetPath.StartsWith($resolvedWorkspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)
  $isKnownAppDataPath = ($env:APPDATA -and $targetPath.StartsWith($env:APPDATA, [System.StringComparison]::OrdinalIgnoreCase)) -or
    ($env:LOCALAPPDATA -and $targetPath.StartsWith($env:LOCALAPPDATA, [System.StringComparison]::OrdinalIgnoreCase))

  if (-not ($isWorkspacePath -or $isKnownAppDataPath)) {
    throw "Refusing to delete path outside approved roots: $targetPath"
  }

  Remove-PathIfExists -PathToRemove $targetPath
}

$evidenceDir = Join-Path $workspaceRoot '.context'
if (-not (Test-Path $evidenceDir)) {
  New-Item -ItemType Directory -Path $evidenceDir | Out-Null
}

$evidencePath = Join-Path $evidenceDir 'DB_CLEAN.md'
@"
# db:clean evidence
- command: pnpm run db:clean
- result: PASS
- product_folder: $productFolderName
- cleaned_paths:
$($uniquePaths | ForEach-Object { "  - $_" } | Out-String)
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "db:clean completed. Evidence written to $evidencePath"
