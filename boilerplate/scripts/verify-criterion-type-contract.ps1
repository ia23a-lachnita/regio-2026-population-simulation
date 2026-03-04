$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'
$acceptancePath = Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.md'
$contractPath = Join-Path $contextDir 'CRITERION_TYPE_CONTRACT.md'

if (-not (Test-Path $acceptancePath)) {
  throw "Criterion contract gate failed. Missing functional acceptance artifact: $acceptancePath"
}

if (-not (Test-Path $contractPath)) {
  throw "Criterion contract gate failed. Missing criterion contract artifact: $contractPath"
}

$acceptance = Get-Content $acceptancePath -Raw
$contract = Get-Content $contractPath -Raw

$requiredFunctionalScenarios = @(
  'criterion-note-fields',
  'criterion-ordinal-fields',
  'criterion-numerical-fields',
  'numerical-range-validation'
)

foreach ($scenarioId in $requiredFunctionalScenarios) {
  $pattern = "(?is)scenario\s*:\s*$([Regex]::Escape([string]$scenarioId)).{0,240}?result\s*:\s*(pass|ok|success)"
  if ($acceptance -notmatch $pattern) {
    throw "Criterion contract gate failed. Functional acceptance missing PASS result for scenario '$scenarioId'."
  }
}

$requiredContractMarkers = @(
  'contract\s*:\s*criterion-type',
  'type\s*:\s*note',
  'type\s*:\s*ordinal',
  'type\s*:\s*numerical',
  'rule\s*:\s*note-non-scoring',
  'rule\s*:\s*ordinal-explicit-options',
  'rule\s*:\s*numerical-no-overlap'
)

foreach ($marker in $requiredContractMarkers) {
  if ($contract -notmatch "(?i)$marker") {
    throw "Criterion contract gate failed. Missing contract marker matching '$marker'."
  }
}

$requiredRulePasses = @(
  'note-non-scoring',
  'ordinal-explicit-options',
  'numerical-no-overlap'
)

foreach ($ruleId in $requiredRulePasses) {
  $rulePassPattern = "(?is)rule\s*:\s*$([Regex]::Escape($ruleId)).{0,240}?result\s*:\s*(pass|ok|success)"
  if ($contract -notmatch $rulePassPattern) {
    throw "Criterion contract gate failed. Missing PASS result for rule '$ruleId' in CRITERION_TYPE_CONTRACT.md."
  }
}

$evidencePath = Join-Path $contextDir 'CRITERION_TYPE_CONTRACT_GATE.md'
@"
# verify:criterion:contract:win evidence
- command: pnpm run verify:criterion:contract:win
- result: PASS
- acceptance_artifact: $acceptancePath
- contract_artifact: $contractPath
- required_functional_scenarios:
$($requiredFunctionalScenarios | ForEach-Object { "  - $_" } | Out-String)
- required_contract_rules:
$($requiredRulePasses | ForEach-Object { "  - $_" } | Out-String)
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Criterion type contract gate passed. Evidence written to $evidencePath"
