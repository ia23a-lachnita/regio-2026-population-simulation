$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'
$evidencePath = Join-Path $contextDir 'EVIDENCE_SCAFFOLD.md'

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

$requiredTextArtifacts = @(
  (Join-Path $contextDir 'PROGRESS.md'),
  (Join-Path $contextDir 'REQUIREMENTS.md'),
  (Join-Path $contextDir 'DOMAIN_MODEL.md'),
  (Join-Path $contextDir 'IMPLEMENTATION_PLAN.md')
)

$requiredJsonArtifacts = @(
  @{ Path = (Join-Path $contextDir 'CRITICAL_SCENARIOS.json'); Label = 'Critical scenarios JSON' },
  @{ Path = (Join-Path $contextDir 'COMMAND_SAFETY.json'); Label = 'Command safety JSON' },
  @{ Path = (Join-Path $contextDir 'FUNCTIONAL_ACCEPTANCE.json'); Label = 'Functional acceptance JSON' },
  @{ Path = (Join-Path $contextDir 'CRITERION_TYPE_CONTRACT.json'); Label = 'Criterion type contract JSON' },
  @{ Path = (Join-Path $contextDir 'UX_BASELINE.json'); Label = 'UX baseline JSON' },
  @{ Path = (Join-Path $contextDir 'SCREENSHOT_REVIEW.json'); Label = 'Screenshot review JSON' }
)

$checks = @()

foreach ($artifact in $requiredTextArtifacts) {
  if (-not (Test-Path $artifact)) {
    throw "Evidence scaffold failed. Missing required scaffold artifact: $artifact"
  }

  $checks += "- scaffold artifact present -> PASS - $artifact"
}

foreach ($artifact in $requiredJsonArtifacts) {
  $json = Get-JsonArtifact -Path $artifact.Path -Label $artifact.Label
  $artifactName = if ($null -ne $json.PSObject.Properties['artifact']) { [string]$json.artifact } else { $null }
  $statusValue = if ($null -ne $json.PSObject.Properties['status']) { [string]$json.status } else { $null }
  $phaseValue = if ($null -ne $json.PSObject.Properties['updated_by_phase']) { [string]$json.updated_by_phase } else { $null }
  $incompleteValue = if ($null -ne $json.PSObject.Properties['incomplete']) { [bool]$json.incomplete } else { $null }

  if ([string]::IsNullOrWhiteSpace($artifactName)) {
    throw "Evidence scaffold failed. $($artifact.Label) must declare an artifact field."
  }

  if ([string]::IsNullOrWhiteSpace($statusValue)) {
    throw "Evidence scaffold failed. $($artifact.Label) must declare a status field."
  }

  if ([string]::IsNullOrWhiteSpace($phaseValue)) {
    throw "Evidence scaffold failed. $($artifact.Label) must declare an updated_by_phase field."
  }

  if ($null -eq $incompleteValue) {
    throw "Evidence scaffold failed. $($artifact.Label) must declare an incomplete field."
  }

  $checks += "- scaffold JSON valid -> PASS - $($artifact.Path)"
}

$screenshotsDir = Join-Path $contextDir 'screenshots'
if (-not (Test-Path $screenshotsDir)) {
  throw "Evidence scaffold failed. Missing screenshots directory: $screenshotsDir"
}

$checks += "- screenshots directory present -> PASS - $screenshotsDir"

@"
# verify:evidence:scaffold:win evidence
- command: pnpm run verify:evidence:scaffold:win
- result: PASS
- checked_artifacts:
$($checks | Out-String)
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Evidence scaffold verification passed. Evidence written to $evidencePath"