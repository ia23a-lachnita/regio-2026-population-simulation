$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'

$requiredArtifacts = @(
  (Join-Path $contextDir 'VERIFY_WIN.md'),
  (Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.md')
)

foreach ($artifact in $requiredArtifacts) {
  if (-not (Test-Path $artifact)) {
    throw "Completion contract failed. Missing required artifact: $artifact"
  }
}

$forbiddenPattern = '(?i)\bTODO\b|placeholder|synthetic-only|hardcoded pass'

foreach ($artifact in $requiredArtifacts) {
  $content = Get-Content $artifact -Raw
  if ($content -match $forbiddenPattern) {
    throw "Completion contract failed. Forbidden placeholder marker found in $artifact"
  }
}

$functionalContent = Get-Content (Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.md') -Raw
if ($functionalContent -match '(?i)\bskipped\b') {
  throw 'Completion contract failed. FUNCTIONAL_ACCEPTANCE.md contains skipped required scenarios.'
}

$summaryPath = Join-Path $contextDir 'FINAL_SUMMARY.md'
if (Test-Path $summaryPath) {
  $summary = Get-Content $summaryPath -Raw
  if ($summary -notmatch '(?i)known limitations') {
    throw 'Completion contract failed. FINAL_SUMMARY.md exists but is missing a "Known Limitations" section.'
  }
}

$evidencePath = Join-Path $contextDir 'COMPLETION_CONTRACT.md'
@"
# verify:completion:contract:win evidence
- command: pnpm run verify:completion:contract:win
- result: PASS
- checked_artifacts:
  - $($requiredArtifacts[0])
  - $($requiredArtifacts[1])
- summary_checked: $([bool](Test-Path $summaryPath))
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Completion contract verification passed. Evidence written to $evidencePath"
