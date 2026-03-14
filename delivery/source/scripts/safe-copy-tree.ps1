param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [Parameter(Mandatory = $true)]
  [string]$Destination,

  [switch]$CleanDestination
)

$ErrorActionPreference = 'Stop'

$sourcePath = Resolve-Path $Source -ErrorAction Stop

if (-not (Test-Path $Destination)) {
  New-Item -Path $Destination -ItemType Directory -Force | Out-Null
}
$destinationPath = Resolve-Path $Destination -ErrorAction Stop

if ($CleanDestination) {
  Get-ChildItem -Path $destinationPath.Path -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
}

Copy-Item -Path (Join-Path $sourcePath.Path '*') -Destination $destinationPath.Path -Recurse -Force

Write-Host "safe-copy-tree completed. Source=$($sourcePath.Path) Destination=$($destinationPath.Path)"
