$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'

$requiredArtifacts = @(
  (Join-Path $contextDir 'PREFLIGHT_WIN.md'),
  (Join-Path $contextDir 'VERIFY_WIN.md'),
  (Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.md'),
  (Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE_GATE.md'),
  (Join-Path $contextDir 'CRITERION_TYPE_CONTRACT.md'),
  (Join-Path $contextDir 'CRITERION_TYPE_CONTRACT_GATE.md'),
  (Join-Path $contextDir 'UX_BASELINE.md'),
  (Join-Path $contextDir 'UX_BASELINE_GATE.md'),
  (Join-Path $contextDir 'RELIABILITY_STATUS.md'),
  (Join-Path $contextDir 'RELIABILITY_GATE.md')
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

if ($functionalContent -notmatch '(?i)crud[- ]scoring[- ]path|end[- ]to[- ]end') {
  throw 'Completion contract failed. FUNCTIONAL_ACCEPTANCE.md must include at least one end-to-end CRUD + scoring path scenario.'
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
$(($requiredArtifacts | ForEach-Object { "  - $_" }) -join "`n")
- summary_checked: $([bool](Test-Path $summaryPath))
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Completion contract verification passed. Evidence written to $evidencePath"
