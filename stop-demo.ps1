$ErrorActionPreference = 'Stop'

$statePath = Join-Path $env:LOCALAPPDATA 'KidCodeNeiva\runtime\processes.json'
if (-not (Test-Path -LiteralPath $statePath)) {
  Write-Output 'No hay una demo iniciada mediante start-demo.ps1.'
  return
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$processes = @(
  [pscustomobject]@{ Id = [int]$state.Tunnel.Id; Name = [string]$state.Tunnel.Name; Started = [string]$state.Tunnel.Started },
  [pscustomobject]@{ Id = [int]$state.Backend.Id; Name = [string]$state.Backend.Name; Started = [string]$state.Backend.Started }
)

foreach ($entry in $processes) {
  $process = Get-Process -Id $entry.Id -ErrorAction SilentlyContinue
  if (-not $process) { continue }

  $expectedStart = [DateTime]::Parse($entry.Started).ToUniversalTime()
  $actualStart = $process.StartTime.ToUniversalTime()
  if ($process.ProcessName -ne $entry.Name -or [Math]::Abs(($actualStart - $expectedStart).TotalSeconds) -gt 2) {
    Write-Warning "Se omite PID $($entry.Id): ya no corresponde al proceso de la demo."
    continue
  }

  Stop-Process -Id $entry.Id
  Write-Output "Detenido: $($entry.Name) (PID $($entry.Id))."
}

Remove-Item -LiteralPath $statePath -Force
Write-Output 'Demo apagada. La base local y el codigo docente siguen guardados en este computador.'
