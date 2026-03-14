$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'
$acceptanceJsonPath = Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.json'
$contractJsonPath = Join-Path $contextDir 'CRITERION_TYPE_CONTRACT.json'
$acceptanceReportPath = Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.md'
$contractReportPath = Join-Path $contextDir 'CRITERION_TYPE_CONTRACT.md'

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

function Get-StringValue {
  param(
    $InputObject,
    [string[]]$PropertyNames
  )

  foreach ($propertyName in $PropertyNames) {
    $property = $InputObject.PSObject.Properties[$propertyName]
    if ($null -ne $property) {
      $value = $property.Value
      if ($null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
        return [string]$value
      }
    }
  }

  return $null
}

function Get-NormalizedResult {
  param($InputObject)

  $result = Get-StringValue $InputObject @('result', 'status', 'outcome')
  if ($null -eq $result) {
    return $null
  }

  return $result.Trim().ToUpperInvariant()
}

$acceptanceData = Get-JsonArtifact -Path $acceptanceJsonPath -Label 'Functional acceptance JSON'
$contractData = Get-JsonArtifact -Path $contractJsonPath -Label 'Criterion contract JSON'

$forbiddenPattern = '(?i)\bTODO\b|placeholder|synthetic-only|hardcoded pass|mock-only'

foreach ($optionalReportPath in @($acceptanceReportPath, $contractReportPath)) {
  if (Test-Path $optionalReportPath) {
    $reportContent = Get-Content $optionalReportPath -Raw
    if ($reportContent -match $forbiddenPattern) {
      throw "Criterion contract gate failed. Optional report contains placeholder markers: $optionalReportPath"
    }
  }
}

if ($null -eq $acceptanceData.scenarios -or @($acceptanceData.scenarios).Count -eq 0) {
  throw 'Criterion contract gate failed. FUNCTIONAL_ACCEPTANCE.json must include a non-empty scenarios array.'
}

if ($null -eq $contractData.rules -or @($contractData.rules).Count -eq 0) {
  throw 'Criterion contract gate failed. CRITERION_TYPE_CONTRACT.json must include a non-empty rules array.'
}

$requiredFunctionalScenarios = @(
  'criterion-note-fields',
  'criterion-ordinal-fields',
  'criterion-numerical-fields',
  'numerical-range-validation'
)

$functionalIndex = @{}
foreach ($scenario in @($acceptanceData.scenarios)) {
  $scenarioId = Get-StringValue $scenario @('id', 'scenario_id', 'scenario')
  if ($null -ne $scenarioId) {
    $functionalIndex[$scenarioId] = $scenario
  }
}

foreach ($scenarioId in $requiredFunctionalScenarios) {
  if (-not $functionalIndex.ContainsKey($scenarioId)) {
    throw "Criterion contract gate failed. Functional acceptance is missing scenario '$scenarioId' in FUNCTIONAL_ACCEPTANCE.json."
  }

  $result = Get-NormalizedResult $functionalIndex[$scenarioId]
  if (@('PASS', 'OK', 'SUCCESS') -notcontains $result) {
    throw "Criterion contract gate failed. Functional acceptance scenario '$scenarioId' is not passing in FUNCTIONAL_ACCEPTANCE.json."
  }
}

$contractKind = Get-StringValue $contractData @('contract', 'artifact')
if ($null -eq $contractKind -or $contractKind -notmatch '(?i)criterion[-_ ]type|criterion_type_contract') {
  throw 'Criterion contract gate failed. CRITERION_TYPE_CONTRACT.json must declare a criterion-type contract identifier.'
}

$requiredTypes = @('note', 'ordinal', 'numerical')
$coveredTypes = @()

foreach ($typeEntry in @($contractData.types)) {
  if ($typeEntry -is [string]) {
    $coveredTypes += $typeEntry
    continue
  }

  $typeValue = Get-StringValue $typeEntry @('id', 'type', 'name')
  if ($null -ne $typeValue) {
    $coveredTypes += $typeValue
  }
}

$coveredTypes = @($coveredTypes | ForEach-Object { $_.Trim().ToLowerInvariant() } | Select-Object -Unique)

foreach ($requiredType in $requiredTypes) {
  if ($coveredTypes -notcontains $requiredType) {
    throw "Criterion contract gate failed. Missing covered type '$requiredType' in CRITERION_TYPE_CONTRACT.json."
  }
}

$requiredRulePasses = @(
  'note-non-scoring',
  'ordinal-explicit-options',
  'numerical-no-overlap'
)

$ruleIndex = @{}
foreach ($rule in @($contractData.rules)) {
  $ruleId = Get-StringValue $rule @('id', 'rule_id', 'rule')
  if ($null -ne $ruleId) {
    $ruleIndex[$ruleId] = $rule
  }
}

foreach ($ruleId in $requiredRulePasses) {
  if (-not $ruleIndex.ContainsKey($ruleId)) {
    throw "Criterion contract gate failed. Missing rule '$ruleId' in CRITERION_TYPE_CONTRACT.json."
  }

  $result = Get-NormalizedResult $ruleIndex[$ruleId]
  if (@('PASS', 'OK', 'SUCCESS') -notcontains $result) {
    throw "Criterion contract gate failed. Rule '$ruleId' is not passing in CRITERION_TYPE_CONTRACT.json."
  }
}

$evidencePath = Join-Path $contextDir 'CRITERION_TYPE_CONTRACT_GATE.md'
@"
# verify:criterion:contract:win evidence
- command: pnpm run verify:criterion:contract:win
- result: PASS
- acceptance_artifact: $acceptanceJsonPath
- contract_artifact: $contractJsonPath
- acceptance_report_artifact: $acceptanceReportPath
- contract_report_artifact: $contractReportPath
- required_functional_scenarios:
$($requiredFunctionalScenarios | ForEach-Object { "  - $_" } | Out-String)
- required_contract_rules:
$($requiredRulePasses | ForEach-Object { "  - $_" } | Out-String)
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Criterion type contract gate passed. Evidence written to $evidencePath"
