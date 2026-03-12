$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'
$acceptanceJsonPath = Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.json'
$acceptanceReportPath = Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.md'
$configPath = Join-Path $contextDir 'CRITICAL_SCENARIOS.json'
$screenshotReviewPath = Join-Path $contextDir 'SCREENSHOT_REVIEW.json'

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

  $result = Get-StringValue $InputObject @('result', 'status', 'outcome', 'self_review_result', 'selfReviewResult')
  if ($null -eq $result) {
    return $null
  }

  return $result.Trim().ToUpperInvariant()
}

function Test-ClaimCollection {
  param($Value)

  if ($null -eq $Value) {
    return $false
  }

  if ($Value -is [string]) {
    return -not [string]::IsNullOrWhiteSpace($Value)
  }

  return @($Value).Count -gt 0
}

$acceptanceData = Get-JsonArtifact -Path $acceptanceJsonPath -Label 'Functional acceptance JSON'

if ($null -eq $acceptanceData.scenarios -or @($acceptanceData.scenarios).Count -eq 0) {
  throw 'Functional acceptance JSON must include a non-empty scenarios array.'
}

$reportContent = $null
if (Test-Path $acceptanceReportPath) {
  $reportContent = Get-Content $acceptanceReportPath -Raw

  if ($reportContent -match '(?i)\bTODO\b|placeholder|synthetic-only|hardcoded pass|mock-only') {
    throw 'Functional acceptance report contains placeholder/synthetic markers.'
  }

  if ($reportContent -match '(?i)\bskipped\b') {
    throw 'Functional acceptance report includes skipped scenarios.'
  }
}

$requiredScenarioIds = @(
  'criterion-note-fields',
  'criterion-ordinal-fields',
  'criterion-numerical-fields',
  'numerical-range-validation',
  'ranking-order-sync',
  'save-validation-reason',
  'crud-scoring-path',
  'keyboard-esc-cancel',
  'criterion-add-button-placement',
  'analysis-header-layout-stability',
  'note-hover-edit-visibility',
  'criterion-enter-save-parity',
  'variant-ordering-behavior',
  'focus-stability-after-input'
)

$requiredScreenshotReviews = @(
  'keyboard-esc-cancel',
  'criterion-add-button-placement',
  'analysis-header-layout-stability',
  'note-hover-edit-visibility',
  'criterion-enter-save-parity',
  'variant-ordering-behavior'
)

if (Test-Path $configPath) {
  try {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    if ($config.required_scenarios -and $config.required_scenarios.Count -gt 0) {
      $requiredScenarioIds = @($config.required_scenarios)
    }
    if ($config.required_screenshot_reviews -and $config.required_screenshot_reviews.Count -gt 0) {
      $requiredScreenshotReviews = @($config.required_screenshot_reviews)
    }
  }
  catch {
    throw "Invalid CRITICAL_SCENARIOS.json format: $($_.Exception.Message)"
  }
}
elseif ($acceptanceData.required_scenarios -and @($acceptanceData.required_scenarios).Count -gt 0) {
  $requiredScenarioIds = @($acceptanceData.required_scenarios)
}

$passResults = @('PASS', 'OK', 'SUCCESS')
$scenarioIndex = @{}

foreach ($scenario in @($acceptanceData.scenarios)) {
  $scenarioId = Get-StringValue $scenario @('id', 'scenario_id', 'scenario')
  if ($null -ne $scenarioId) {
    $scenarioIndex[$scenarioId] = $scenario
  }
}

$missing = @()
foreach ($scenarioId in $requiredScenarioIds) {
  if (-not $scenarioIndex.ContainsKey($scenarioId)) {
    $missing += $scenarioId
  }
}

if ($missing.Count -gt 0) {
  throw "Functional acceptance is missing required scenarios: $($missing -join ', ')"
}

foreach ($scenarioId in $requiredScenarioIds) {
  $result = Get-NormalizedResult $scenarioIndex[$scenarioId]
  if ($result -eq 'SKIPPED') {
    throw "Functional acceptance scenario '$scenarioId' is marked as skipped in FUNCTIONAL_ACCEPTANCE.json."
  }

  if ($passResults -notcontains $result) {
    throw "Functional acceptance scenario '$scenarioId' is not passing in FUNCTIONAL_ACCEPTANCE.json."
  }
}

$screenshotReview = Get-JsonArtifact -Path $screenshotReviewPath -Label 'Screenshot review JSON'
if ($null -eq $screenshotReview.reviews -or @($screenshotReview.reviews).Count -eq 0) {
  throw 'Functional acceptance gate failed. SCREENSHOT_REVIEW.json must include a non-empty reviews array.'
}

$reviewIndex = @{}
foreach ($review in @($screenshotReview.reviews)) {
  $scenarioId = Get-StringValue $review @('scenario_id', 'scenarioId', 'id')
  if ($null -ne $scenarioId) {
    $reviewIndex[$scenarioId] = $review
  }
}

foreach ($scenarioId in $requiredScreenshotReviews) {
  if (-not $reviewIndex.ContainsKey($scenarioId)) {
    throw "Functional acceptance gate failed. Missing screenshot review for scenario '$scenarioId'."
  }

  $review = $reviewIndex[$scenarioId]
  $reviewResult = Get-NormalizedResult $review
  $screenshotPathValue = Get-StringValue $review @('screenshot_path', 'screenshotPath')
  $openUiConcerns = $review.PSObject.Properties['open_ui_concerns']
  if ($null -eq $openUiConcerns) {
    $openUiConcerns = $review.PSObject.Properties['openUiConcerns']
  }

  if (-not (Test-ClaimCollection $review.expected_ui_claims) -and -not (Test-ClaimCollection $review.expectedUiClaims)) {
    throw "Functional acceptance gate failed. Screenshot review '$scenarioId' is missing expected_ui_claims."
  }

  if ([string]::IsNullOrWhiteSpace($screenshotPathValue)) {
    throw "Functional acceptance gate failed. Screenshot review '$scenarioId' is missing screenshot_path."
  }

  $resolvedScreenshotPath = if ([System.IO.Path]::IsPathRooted($screenshotPathValue)) {
    $screenshotPathValue
  } else {
    Join-Path $workspaceRoot $screenshotPathValue
  }

  if (-not (Test-Path $resolvedScreenshotPath)) {
    throw "Functional acceptance gate failed. Screenshot review '$scenarioId' references missing file '$resolvedScreenshotPath'."
  }

  if ($null -eq $openUiConcerns) {
    throw "Functional acceptance gate failed. Screenshot review '$scenarioId' is missing open_ui_concerns."
  }

  $needsHumanReview = $false
  if ($null -ne $review.PSObject.Properties['needs_human_review']) {
    $needsHumanReview = [bool]$review.needs_human_review
  } elseif ($null -ne $review.PSObject.Properties['needsHumanReview']) {
    $needsHumanReview = [bool]$review.needsHumanReview
  } else {
    throw "Functional acceptance gate failed. Screenshot review '$scenarioId' is missing needs_human_review."
  }

  if ($needsHumanReview) {
    throw "Functional acceptance gate failed. Screenshot review '$scenarioId' still requires human review."
  }

  if ($passResults -notcontains $reviewResult) {
    throw "Functional acceptance gate failed. Screenshot review '$scenarioId' is not marked PASS."
  }
}

$evidencePath = Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE_GATE.md'
@"
# functional:acceptance:win evidence
- command: pnpm run functional:acceptance:win
- result: PASS
- source_artifact: $acceptanceJsonPath
- report_artifact: $acceptanceReportPath
- screenshot_review_artifact: $screenshotReviewPath
- strict_result_validation: enabled
- required_scenarios:
$($requiredScenarioIds | ForEach-Object { "  - $_" } | Out-String)
- required_screenshot_reviews:
$($requiredScreenshotReviews | ForEach-Object { "  - $_" } | Out-String)
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Functional acceptance gate passed. Evidence written to $evidencePath"
