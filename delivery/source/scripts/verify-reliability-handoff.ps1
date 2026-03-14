$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'
$statusPath = Join-Path $contextDir 'RELIABILITY_STATUS.md'
$handoffPath = Join-Path $contextDir 'HANDOFF_MANIFEST.md'

if (-not (Test-Path $statusPath)) {
  throw "Reliability gate failed. Missing reliability status artifact: $statusPath"
}

$statusContent = Get-Content $statusPath -Raw

if ($statusContent -notmatch '(?i)inactivity_threshold_minutes\s*:\s*\d+') {
  throw 'Reliability gate failed. RELIABILITY_STATUS.md must include inactivity_threshold_minutes.'
}

if ($statusContent -notmatch '(?i)timeout_threshold_minutes\s*:\s*\d+') {
  throw 'Reliability gate failed. RELIABILITY_STATUS.md must include timeout_threshold_minutes.'
}

$noHandoff = $statusContent -match '(?i)status\s*:\s*NO_HANDOFF_REQUIRED'
$handoffCompleted = $statusContent -match '(?i)status\s*:\s*HANDOFF_COMPLETED'

if (-not $noHandoff -and -not $handoffCompleted) {
  throw 'Reliability gate failed. status must be NO_HANDOFF_REQUIRED or HANDOFF_COMPLETED.'
}

if ($handoffCompleted) {
  if (-not (Test-Path $handoffPath)) {
    throw "Reliability gate failed. HANDOFF_COMPLETED requires manifest: $handoffPath"
  }

  $handoffContent = Get-Content $handoffPath -Raw
  $requiredHandoffFields = @(
    'handoff_reason\s*:',
    'from_agent\s*:',
    'to_agent\s*:',
    'checkpoint_artifacts\s*:'
  )

  foreach ($fieldRegex in $requiredHandoffFields) {
    if ($handoffContent -notmatch "(?i)$fieldRegex") {
      throw "Reliability gate failed. HANDOFF_MANIFEST.md is missing field matching '$fieldRegex'."
    }
  }

  if ($handoffContent -notmatch '(?m)^\s*-\s+workspace/.context/') {
    throw 'Reliability gate failed. HANDOFF_MANIFEST.md must include at least one checkpoint artifact bullet under checkpoint_artifacts.'
  }
}

$statusValue = if ($noHandoff) { 'NO_HANDOFF_REQUIRED' } else { 'HANDOFF_COMPLETED' }
$evidencePath = Join-Path $contextDir 'RELIABILITY_GATE.md'
@"
# verify:reliability:win evidence
- command: pnpm run verify:reliability:win
- result: PASS
- status_artifact: $statusPath
- handoff_manifest_checked: $([bool]$handoffCompleted)
- status: $statusValue
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Reliability gate passed. Evidence written to $evidencePath"
