$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'
if (-not (Test-Path $contextDir)) {
  New-Item -Path $contextDir -ItemType Directory | Out-Null
}

$checks = @()
$failures = @()

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $nodeCmd) {
  $checks += '- Node available -> FAIL - node command not found in PATH.'
  $failures += 'Node available -> node command not found in PATH.'
} else {
  $nodeVersion = (& node --version).Trim()
  $nodeMajor = [int](($nodeVersion -replace '^v', '').Split('.')[0])
  $ok = $nodeMajor -ge 18
  if ($ok) {
    $checks += "- Node available -> PASS - Detected $nodeVersion (requires >= v18)."
  } else {
    $checks += "- Node available -> FAIL - Detected $nodeVersion (requires >= v18)."
    $failures += "Node available -> Detected $nodeVersion (requires >= v18)."
  }
}

$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
if ($null -eq $pnpmCmd) {
  $checks += '- pnpm available -> FAIL - pnpm command not found in PATH.'
  $failures += 'pnpm available -> pnpm command not found in PATH.'
} else {
  $pnpmVersion = (& pnpm --version).Trim()
  $checks += "- pnpm available -> PASS - Detected $pnpmVersion."
}

$electronPath = Join-Path $workspaceRoot 'node_modules\electron\package.json'
if (Test-Path $electronPath) {
  $checks += "- Electron dependency -> PASS - Expected $electronPath"
} else {
  $checks += "- Electron dependency -> FAIL - Expected $electronPath"
  $failures += "Electron dependency -> Expected $electronPath"
}

$builderPath = Join-Path $workspaceRoot 'node_modules\electron-builder\package.json'
if (Test-Path $builderPath) {
  $checks += "- electron-builder dependency -> PASS - Expected $builderPath"
} else {
  $checks += "- electron-builder dependency -> FAIL - Expected $builderPath"
  $failures += "electron-builder dependency -> Expected $builderPath"
}

$betterSqlitePath = Join-Path $workspaceRoot 'node_modules\better-sqlite3\package.json'
if (Test-Path $betterSqlitePath) {
  $checks += "- better-sqlite3 dependency -> PASS - Expected $betterSqlitePath"
} else {
  $checks += "- better-sqlite3 dependency -> FAIL - Expected $betterSqlitePath"
  $failures += "better-sqlite3 dependency -> Expected $betterSqlitePath"
}

$releaseDir = Join-Path $workspaceRoot 'release'
try {
  if (-not (Test-Path $releaseDir)) {
    New-Item -Path $releaseDir -ItemType Directory | Out-Null
  }
  $probe = Join-Path $releaseDir '.preflight-write-test'
  'ok' | Set-Content -Path $probe -Encoding UTF8
  Remove-Item -Path $probe -Force
  $checks += "- Release output writable -> PASS - Verified write access to $releaseDir"
}
catch {
  $checks += "- Release output writable -> FAIL - $($_.Exception.Message)"
  $failures += "Release output writable -> $($_.Exception.Message)"
}

$overallStatus = 'PASS'
if ($failures.Count -gt 0) {
  $overallStatus = 'FAIL'
}

$evidencePath = Join-Path $contextDir 'PREFLIGHT_WIN.md'
$evidence = @(
  '# preflight:win evidence',
  '- command: pnpm run preflight:win',
  "- timestamp: $((Get-Date).ToString('s'))",
  "- workspace: $workspaceRoot",
  '- checks:',
  $checks,
  "- status: $overallStatus"
)
$evidence -join [Environment]::NewLine | Set-Content -Path $evidencePath -Encoding UTF8

if ($failures.Count -gt 0) {
  $failureMessage = $failures -join '; '
  throw "Windows preflight failed. $failureMessage. See $evidencePath"
}

Write-Host "Windows preflight passed. Evidence written to $evidencePath"
