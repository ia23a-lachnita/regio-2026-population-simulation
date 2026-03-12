$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'

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

$requiredArtifacts = @(
  (Join-Path $contextDir 'PREFLIGHT_WIN.md'),
  (Join-Path $contextDir 'VERIFY_WIN.md'),
  (Join-Path $contextDir 'DB_CLEAN.md'),
  (Join-Path $contextDir 'DB_RESET.md'),
  (Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE_GATE.md'),
  (Join-Path $contextDir 'CRITERION_TYPE_CONTRACT_GATE.md'),
  (Join-Path $contextDir 'UX_BASELINE_GATE.md'),
  (Join-Path $contextDir 'RELIABILITY_STATUS.md'),
  (Join-Path $contextDir 'RELIABILITY_GATE.md')
)

$requiredJsonArtifacts = @(
  (Join-Path $contextDir 'DB_RESET.json'),
  (Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.json'),
  (Join-Path $contextDir 'CRITERION_TYPE_CONTRACT.json'),
  (Join-Path $contextDir 'UX_BASELINE.json'),
  (Join-Path $contextDir 'SCREENSHOT_REVIEW.json')
)

$optionalReadableReports = @(
  (Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.md'),
  (Join-Path $contextDir 'CRITERION_TYPE_CONTRACT.md'),
  (Join-Path $contextDir 'UX_BASELINE.md')
)

foreach ($artifact in $requiredArtifacts) {
  if (-not (Test-Path $artifact)) {
    throw "Completion contract failed. Missing required artifact: $artifact"
  }
}

foreach ($artifact in $requiredJsonArtifacts) {
  if (-not (Test-Path $artifact)) {
    throw "Completion contract failed. Missing required machine-readable artifact: $artifact"
  }
}

$forbiddenPattern = '(?i)\bTODO\b|placeholder|synthetic-only|hardcoded pass'

foreach ($artifact in $requiredArtifacts) {
  $content = Get-Content $artifact -Raw
  if ($content -match $forbiddenPattern) {
    throw "Completion contract failed. Forbidden placeholder marker found in $artifact"
  }
}

foreach ($reportPath in $optionalReadableReports) {
  if (Test-Path $reportPath) {
    $content = Get-Content $reportPath -Raw
    if ($content -match $forbiddenPattern) {
      throw "Completion contract failed. Forbidden placeholder marker found in $reportPath"
    }
  }
}

$functionalData = Get-JsonArtifact -Path (Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.json') -Label 'Functional acceptance JSON'

if ($null -eq $functionalData.scenarios -or @($functionalData.scenarios).Count -eq 0) {
  throw 'Completion contract failed. FUNCTIONAL_ACCEPTANCE.json must include a non-empty scenarios array.'
}

$passResults = @('PASS', 'OK', 'SUCCESS')
$hasEndToEndScenario = $false

foreach ($scenario in @($functionalData.scenarios)) {
  $scenarioId = Get-StringValue $scenario @('id', 'scenario_id', 'scenario')
  $result = Get-NormalizedResult $scenario

  if ($result -eq 'SKIPPED') {
    throw "Completion contract failed. FUNCTIONAL_ACCEPTANCE.json contains skipped scenario '$scenarioId'."
  }

  if ($null -ne $result -and $passResults -notcontains $result) {
    throw "Completion contract failed. FUNCTIONAL_ACCEPTANCE.json contains non-passing scenario '$scenarioId'."
  }

  $endToEndFlag = $false
  if ($null -ne $scenario.PSObject.Properties['end_to_end']) {
    $endToEndFlag = [bool]$scenario.end_to_end
  }
  elseif ($null -ne $scenario.PSObject.Properties['endToEnd']) {
    $endToEndFlag = [bool]$scenario.endToEnd
  }

  if ($endToEndFlag -or $scenarioId -match '(?i)crud[- ]scoring[- ]path|end[- ]to[- ]end') {
    if ($passResults -contains $result) {
      $hasEndToEndScenario = $true
    }
  }
}

if (-not $hasEndToEndScenario) {
  throw 'Completion contract failed. FUNCTIONAL_ACCEPTANCE.json must include at least one passing end-to-end CRUD + scoring path scenario.'
}

$summaryPath = Join-Path $contextDir 'FINAL_SUMMARY.md'
if (Test-Path $summaryPath) {
  $summary = Get-Content $summaryPath -Raw
  if ($summary -notmatch '(?i)known limitations') {
    throw 'Completion contract failed. FINAL_SUMMARY.md exists but is missing a "Known Limitations" section.'
  }
}

$completionStatusPath = Join-Path $contextDir 'COMPLETION_STATUS.json'
$checkedArtifactJsonLines = (($requiredArtifacts + $requiredJsonArtifacts) | ForEach-Object { '    "' + ($_ -replace '\\', '\\\\') + '"' }) -join ",`n"
@"
{
  "artifact": "completion_status",
  "workflow_status": "PASS",
  "product_status": "PASS",
  "open_p0_issues": [],
  "machine_evidence_first": true,
  "checked_artifacts": [
$checkedArtifactJsonLines
  ],
  "summary_checked": $([string]([bool](Test-Path $summaryPath))).ToLower()
}
"@ | Set-Content -Path $completionStatusPath -Encoding UTF8

$evidencePath = Join-Path $contextDir 'COMPLETION_CONTRACT.md'
@"
# verify:completion:contract:win evidence
- command: pnpm run verify:completion:contract:win
- result: PASS
- workflow_status: PASS
- product_status: PASS
- open_p0_issues: none
- checked_artifacts:
$(($requiredArtifacts + $requiredJsonArtifacts) | ForEach-Object { "  - $_" } | Out-String)
- completion_status_artifact: $completionStatusPath
- summary_checked: $([bool](Test-Path $summaryPath))
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Completion contract verification passed. Evidence written to $evidencePath"
