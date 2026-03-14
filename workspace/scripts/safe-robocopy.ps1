param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [Parameter(Mandatory = $true)]
  [string]$Destination,

  [switch]$Mirror,
  [switch]$IncludeEmptyDirs,
  [switch]$Purge,
  [int]$Retries = 2,
  [int]$WaitSeconds = 1
)

$ErrorActionPreference = 'Stop'

$sourcePath = Resolve-Path $Source -ErrorAction Stop
if (-not (Test-Path $Destination)) {
  New-Item -Path $Destination -ItemType Directory -Force | Out-Null
}
$destinationPath = Resolve-Path $Destination -ErrorAction Stop

$options = @('/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS', "/R:$Retries", "/W:$WaitSeconds")

if ($Mirror) { $options += '/MIR' }
if ($IncludeEmptyDirs) { $options += '/E' }
if ($Purge -and -not $Mirror) { $options += '/PURGE' }

$arguments = @(
  '"' + $sourcePath.Path + '"',
  '"' + $destinationPath.Path + '"',
  '*.*'
) + $options

$process = Start-Process -FilePath 'robocopy.exe' -ArgumentList $arguments -Wait -PassThru -NoNewWindow

if ($process.ExitCode -ge 8) {
  throw "robocopy failed with exit code $($process.ExitCode)."
}

Write-Host "safe-robocopy completed. Source=$($sourcePath.Path) Destination=$($destinationPath.Path) ExitCode=$($process.ExitCode)"
