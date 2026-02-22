$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$summaryPath = Join-Path $workspaceRoot '.context\INPUT_PREP_SUMMARY.json'

if (-not (Test-Path $summaryPath)) {
  throw "Input preparation summary not found: $summaryPath. Run Phase 0 (prepare-input.py) before verify:win."
}

$summary = Get-Content $summaryPath -Raw | ConvertFrom-Json

if (-not $summary.status) {
  throw "Invalid input preparation summary: missing status field."
}

if ($summary.status -eq 'FAIL') {
  throw "Input preparation failed visual gate. See $summaryPath"
}

$pdfFailed = [int]($summary.pdf_converted_failed)
if ($pdfFailed -gt 0) {
  throw "Input preparation has PDF conversion failures ($pdfFailed). Resolve before verify:win."
}

Write-Host "Input preparation evidence OK: $summaryPath"
