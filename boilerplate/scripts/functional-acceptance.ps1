$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'
$acceptancePath = Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.md'
$configPath = Join-Path $contextDir 'CRITICAL_SCENARIOS.json'

if (-not (Test-Path $acceptancePath)) {
  throw "Functional acceptance artifact missing: $acceptancePath"
}

$content = Get-Content $acceptancePath -Raw

if ($content -match '(?i)\bTODO\b|placeholder|synthetic-only|hardcoded pass|mock-only') {
  throw "Functional acceptance artifact contains placeholder/synthetic markers."
}

if ($content -match '(?i)\bskipped\b') {
  throw "Functional acceptance artifact includes skipped scenarios."
}

$requiredScenarioIds = @(
  'criterion-note-fields',
  'criterion-ordinal-fields',
  'criterion-numerical-fields',
  'numerical-range-validation',
  'ranking-order-sync',
  'save-validation-reason',
  'crud-scoring-path'
)

if (Test-Path $configPath) {
  try {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    if ($config.required_scenarios -and $config.required_scenarios.Count -gt 0) {
      $requiredScenarioIds = @($config.required_scenarios)
    }
  }
  catch {
    throw "Invalid CRITICAL_SCENARIOS.json format: $($_.Exception.Message)"
  }
}

$missing = @()
foreach ($scenarioId in $requiredScenarioIds) {
  $pattern = "(?i)scenario\s*:\s*$([Regex]::Escape([string]$scenarioId))"
  if ($content -notmatch $pattern) {
    $missing += $scenarioId
  }
}

if ($missing.Count -gt 0) {
  throw "Functional acceptance is missing required scenarios: $($missing -join ', ')"
}

if ($content -match '(?i)\bresult\s*:\s*fail\b|\bstatus\s*:\s*fail\b') {
  throw "Functional acceptance artifact contains failing scenario results."
}

foreach ($scenarioId in $requiredScenarioIds) {
  $resultPattern = "(?is)scenario\s*:\s*$([Regex]::Escape([string]$scenarioId)).{0,300}?result\s*:\s*(pass|ok|success)"
  if ($content -notmatch $resultPattern) {
    throw "Functional acceptance scenario '$scenarioId' is missing a pass result marker."
  }
}

$evidencePath = Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE_GATE.md'
@"
# functional:acceptance:win evidence
- command: pnpm run functional:acceptance:win
- result: PASS
- source_artifact: $acceptancePath
- strict_result_validation: enabled
- required_scenarios:
$($requiredScenarioIds | ForEach-Object { "  - $_" } | Out-String)
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Functional acceptance gate passed. Evidence written to $evidencePath"
