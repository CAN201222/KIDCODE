$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$frontendRoot = Join-Path $projectRoot 'frontend'
$localRoot = Join-Path $env:LOCALAPPDATA 'KidCodeNeiva'
$runtimeRoot = Join-Path $localRoot 'runtime'
$envPath = Join-Path $backendRoot '.env'
$statePath = Join-Path $runtimeRoot 'processes.json'
$cloudflaredPath = Join-Path $localRoot 'cloudflared-windows-amd64.exe'

New-Item -ItemType Directory -Force -Path $localRoot, $runtimeRoot | Out-Null

if (-not (Test-Path -LiteralPath $envPath)) {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $jwtBytes = New-Object byte[] 48
  $inviteBytes = New-Object byte[] 24
  $rng.GetBytes($jwtBytes)
  $rng.GetBytes($inviteBytes)
  $jwtSecret = [Convert]::ToBase64String($jwtBytes)
  $inviteCode = 'KCN-' + [BitConverter]::ToString($inviteBytes).Replace('-', '')
  $databasePath = Join-Path $localRoot 'kidcode-demo.db'
  @(
    'NODE_ENV=production'
    'PORT=5000'
    "JWT_SECRET=$jwtSecret"
    "TEACHER_REGISTRATION_CODE=$inviteCode"
    "KIDCODE_DB_PATH=$databasePath"
  ) | Set-Content -LiteralPath $envPath -Encoding ASCII
}

Get-Content -LiteralPath $envPath | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
  }
}

if ($env:NODE_ENV -ne 'production' -or $env:JWT_SECRET.Length -lt 32) {
  throw 'backend\.env debe definir NODE_ENV=production y un JWT_SECRET de al menos 32 caracteres.'
}

$port = [int]$env:PORT
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  throw "El puerto $port ya está ocupado (PID $($listener.OwningProcess)). Apaga la demo o libera ese puerto antes de iniciar."
}

if (-not (Test-Path -LiteralPath (Join-Path $backendRoot 'node_modules'))) {
  Push-Location $backendRoot
  try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias del backend.' }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $frontendRoot 'node_modules'))) {
  Push-Location $frontendRoot
  try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias del frontend.' }
  } finally {
    Pop-Location
  }
}

Push-Location $frontendRoot
try {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el frontend.' }
} finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $cloudflaredPath)) {
  $downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/download/2026.11.1/cloudflared-windows-amd64.exe'
  Invoke-WebRequest -Uri $downloadUrl -OutFile $cloudflaredPath -UseBasicParsing
  $actualHash = (Get-FileHash -LiteralPath $cloudflaredPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $expectedHash = '341deda3db5ec498a0482254d6c38c0b7cf01a30c37bb5dd95d2216d08955e35'
  if ($actualHash -ne $expectedHash) {
    Remove-Item -LiteralPath $cloudflaredPath -Force
    throw 'La verificación del cliente Cloudflare Tunnel falló.'
  }
}

$backendOut = Join-Path $runtimeRoot 'backend.out.log'
$backendErr = Join-Path $runtimeRoot 'backend.err.log'
$tunnelOut = Join-Path $runtimeRoot 'tunnel.out.log'
$tunnelErr = Join-Path $runtimeRoot 'tunnel.err.log'
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$backendProcess = $null
$tunnelProcess = $null

try {
  $backendProcess = Start-Process -FilePath $nodePath -ArgumentList 'src/server.js' `
    -WorkingDirectory $backendRoot -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr

  $health = $null
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 2
      if ($health.status -eq 'OK') { break }
    } catch {
      if ($backendProcess.HasExited) { break }
    }
  }
  if (-not $health -or $health.status -ne 'OK') {
    throw 'El backend no respondió. Revisa backend.err.log en la carpeta runtime local.'
  }

  $tunnelProcess = Start-Process -FilePath $cloudflaredPath `
    -ArgumentList @('tunnel', '--url', "http://127.0.0.1:$port", '--no-autoupdate') `
    -PassThru -WindowStyle Hidden -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr

  $publicUrl = ''
  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    Start-Sleep -Seconds 1
    foreach ($logPath in @($tunnelOut, $tunnelErr)) {
      if (Test-Path -LiteralPath $logPath) {
        $logText = Get-Content -LiteralPath $logPath -Raw -ErrorAction SilentlyContinue
        if ($logText -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
          $publicUrl = $matches[0]
          break
        }
      }
    }
    if ($publicUrl) { break }
    if ($tunnelProcess.HasExited) { throw 'El túnel terminó antes de crear la URL. Revisa tunnel.err.log.' }
  }
  if (-not $publicUrl) { throw 'No se pudo obtener una URL pública del túnel.' }

  [pscustomobject]@{
    Backend = [pscustomobject]@{
      Id = $backendProcess.Id
      Name = $backendProcess.ProcessName
      Started = $backendProcess.StartTime.ToUniversalTime().ToString('o')
    }
    Tunnel = [pscustomobject]@{
      Id = $tunnelProcess.Id
      Name = $tunnelProcess.ProcessName
      Started = $tunnelProcess.StartTime.ToUniversalTime().ToString('o')
    }
    Url = $publicUrl
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding ASCII

  Write-Output ''
  Write-Output "Demo lista: $publicUrl"
  Write-Output "Codigo de invitacion docente (privado): $env:TEACHER_REGISTRATION_CODE"
  Write-Output 'Manten este computador encendido y conectado. La URL puede cambiar cada vez que reinicies el tunel.'
} catch {
  if ($tunnelProcess -and -not $tunnelProcess.HasExited) {
    Stop-Process -Id $tunnelProcess.Id -ErrorAction SilentlyContinue
  }
  if ($backendProcess -and -not $backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
  }
  throw
}
