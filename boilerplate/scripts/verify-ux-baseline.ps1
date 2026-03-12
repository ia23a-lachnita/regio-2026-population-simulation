$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'
$baselineJsonPath = Join-Path $contextDir 'UX_BASELINE.json'
$baselineReportPath = Join-Path $contextDir 'UX_BASELINE.md'
$configPath = Join-Path $contextDir 'CRITICAL_SCENARIOS.json'

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

$baselineData = Get-JsonArtifact -Path $baselineJsonPath -Label 'UX baseline JSON'

if ($null -eq $baselineData.checks -or @($baselineData.checks).Count -eq 0) {
  throw 'UX baseline gate failed. UX_BASELINE.json must include a non-empty checks array.'
}

if (Test-Path $baselineReportPath) {
  $reportContent = Get-Content $baselineReportPath -Raw
  if ($reportContent -match '(?i)\bskipped\b|\bresult\s*:\s*fail\b|\bstatus\s*:\s*fail\b') {
    throw 'UX baseline gate failed. UX_BASELINE.md contains skipped or failing checks.'
  }

  if ($reportContent -match '(?i)\bTODO\b|placeholder|synthetic-only|hardcoded pass|mock-only') {
    throw 'UX baseline gate failed. UX_BASELINE.md contains placeholder markers.'
  }
}

$requiredChecks = @(
  'keyboard-enter-confirm',
  'keyboard-esc-cancel',
  'validation-copy-visible',
  'focus-stability',
  'note-edit-ergonomics',
  'criterion-add-button-placement',
  'analysis-header-layout-stability',
  'note-hover-edit-visibility',
  'criterion-enter-save-parity',
  'variant-ordering-behavior',
  'focus-stability-after-input'
)

if (Test-Path $configPath) {
  try {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    if ($config.required_ux_checks -and $config.required_ux_checks.Count -gt 0) {
      $requiredChecks = @($config.required_ux_checks)
    }
  }
  catch {
    throw "Invalid CRITICAL_SCENARIOS.json format: $($_.Exception.Message)"
  }
}

$checkIndex = @{}
foreach ($check in @($baselineData.checks)) {
  $checkId = Get-StringValue $check @('id', 'check_id', 'check')
  if ($null -ne $checkId) {
    $checkIndex[$checkId] = $check
  }
}

foreach ($checkId in $requiredChecks) {
  if (-not $checkIndex.ContainsKey($checkId)) {
    throw "UX baseline gate failed. Missing check '$checkId' in UX_BASELINE.json."
  }

  $result = Get-NormalizedResult $checkIndex[$checkId]
  if (@('PASS', 'OK', 'SUCCESS') -notcontains $result) {
    throw "UX baseline gate failed. Check '$checkId' is not passing in UX_BASELINE.json."
  }
}

$evidencePath = Join-Path $contextDir 'UX_BASELINE_GATE.md'
@"
# verify:ux:baseline:win evidence
- command: pnpm run verify:ux:baseline:win
- result: PASS
- baseline_artifact: $baselineJsonPath
- baseline_report_artifact: $baselineReportPath
- config_artifact: $configPath
- required_checks:
$($requiredChecks | ForEach-Object { "  - $_" } | Out-String)
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "UX baseline gate passed. Evidence written to $evidencePath"
