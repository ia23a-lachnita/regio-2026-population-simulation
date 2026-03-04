$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$contextDir = Join-Path $workspaceRoot '.context'
$baselinePath = Join-Path $contextDir 'UX_BASELINE.md'

if (-not (Test-Path $baselinePath)) {
  throw "UX baseline gate failed. Missing UX baseline artifact: $baselinePath"
}

$content = Get-Content $baselinePath -Raw

if ($content -match '(?i)\bskipped\b|\bresult\s*:\s*fail\b|\bstatus\s*:\s*fail\b') {
  throw 'UX baseline gate failed. UX_BASELINE.md contains skipped or failing checks.'
}

$requiredChecks = @(
  'keyboard-enter-confirm',
  'keyboard-esc-cancel',
  'validation-copy-visible',
  'focus-stability',
  'note-edit-ergonomics'
)

foreach ($checkId in $requiredChecks) {
  $pattern = "(?is)check\s*:\s*$([Regex]::Escape($checkId)).{0,240}?result\s*:\s*(pass|ok|success)"
  if ($content -notmatch $pattern) {
    throw "UX baseline gate failed. Missing PASS result for check '$checkId'."
  }
}

$evidencePath = Join-Path $contextDir 'UX_BASELINE_GATE.md'
@"
# verify:ux:baseline:win evidence
- command: pnpm run verify:ux:baseline:win
- result: PASS
- baseline_artifact: $baselinePath
- required_checks:
$($requiredChecks | ForEach-Object { "  - $_" } | Out-String)
"@ | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "UX baseline gate passed. Evidence written to $evidencePath"
