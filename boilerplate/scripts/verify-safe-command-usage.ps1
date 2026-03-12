$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'
$commandSafetyPath = Join-Path $contextDir 'COMMAND_SAFETY.json'
$evidencePath = Join-Path $contextDir 'COMMAND_SAFETY.md'

function Get-JsonArtifact {
  param(
    [string]$Path,
    [string]$Label
  )

  if (-not (Test-Path $Path)) {
    throw "$Label artifact missing: $Path"
  }

  try {
    return Get-Content $Path -Raw | ConvertFrom-Json
  }
  catch {
    throw "Invalid $Label JSON format: $($_.Exception.Message)"
  }
}

$commandSafety = Get-JsonArtifact -Path $commandSafetyPath -Label 'Command safety JSON'
if ($null -eq $commandSafety.PSObject.Properties['incidents']) {
  throw 'Command safety verification failed. COMMAND_SAFETY.json must include an incidents array.'
}

$candidateFiles = @()
$candidateFiles += Get-ChildItem -Path $contextDir -File -Include *.md,*.txt,*.json -ErrorAction SilentlyContinue
$summaryPath = Join-Path $contextDir 'FINAL_SUMMARY.md'
if (Test-Path $summaryPath) {
  $candidateFiles += Get-Item $summaryPath
}

$forbiddenPattern = '(?im)\brobocopy\b[^\r\n]*\s/[A-Za-z]'
$violations = @()

foreach ($file in $candidateFiles | Sort-Object FullName -Unique) {
  if ($file.FullName -eq $commandSafetyPath) {
    continue
  }

  $content = Get-Content $file.FullName -Raw
  if ($content -match $forbiddenPattern) {
    $violations += $file.FullName
  }
}

if ($violations.Count -gt 0) {
  throw "Command safety verification failed. Raw robocopy command snippets found in: $($violations -join ', ')"
}

$incidents = @($commandSafety.incidents)
$incidentSummary = if ($incidents.Count -eq 0) {
  '  - none'
} else {
  ($incidents | ForEach-Object { "  - $_" }) -join "`n"
}

@"
# verify:safe:commands:win evidence
- command: pnpm run verify:safe:commands:win
- result: PASS
- command_safety_artifact: $commandSafetyPath
- raw_robocopy_snippet_check: PASS
- incidents:
$incidentSummary
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Command safety verification passed. Evidence written to $evidencePath"