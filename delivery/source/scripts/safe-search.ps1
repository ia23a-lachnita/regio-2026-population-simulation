param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [Parameter(Mandatory = $true)]
  [string]$Pattern,

  [switch]$Regex,
  [switch]$CaseSensitive,
  [switch]$Recurse
)

$ErrorActionPreference = 'Stop'

$resolvedPath = Resolve-Path $Path -ErrorAction Stop

$selectParams = @{
  Path = $resolvedPath.Path
  Pattern = $Pattern
}

if (-not $CaseSensitive) {
  $selectParams.CaseSensitive = $false
}
if ($Regex) {
  $selectParams.SimpleMatch = $false
} else {
  $selectParams.SimpleMatch = $true
}
if ($Recurse) {
  $selectParams.Recurse = $true
}

Select-String @selectParams
