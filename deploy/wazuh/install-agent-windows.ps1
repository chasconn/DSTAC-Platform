<#
  DSTAC EDR - Instalador de agente Wazuh para Windows
  ----------------------------------------------------
  Descarga el agente, lo enrola contra el Manager de DSTAC y lo arranca.
  Pregunta el NOMBRE del equipo con una ventana (o se pasa con -Nombre).

  Uso (PowerShell como Administrador):
    $env:WAZUH_ENROLL_PASSWORD="<clave>"
    powershell -ExecutionPolicy Bypass -File install-agent-windows.ps1 -Empresa "kali-test"

  O con nombre explicito:
    ... -File install-agent-windows.ps1 -Nombre "RECEPCION-PC" -Empresa "kali-test"

  Grupo Wazuh opcional:
    ... -File install-agent-windows.ps1 -Empresa "kali-test" -Grupo "sucursales"
#>
param(
  [string]$Nombre  = "",
  [string]$Empresa = "",
  [string]$Grupo   = ""
)
$ErrorActionPreference = "Stop"

# ===== Configuracion DSTAC =====
$Manager  = "2.25.183.242"
$MsiUrl   = "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.5-1.msi"
# ===============================

# Clave de enrolamiento por entorno (no se hardcodea en el repo)
$EnrollPass = $env:WAZUH_ENROLL_PASSWORD

function Die($m) { Write-Host $m -ForegroundColor Red; exit 1 }

# Requiere Administrador
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Die "Abre PowerShell como Administrador y vuelve a ejecutar." }
if (-not $EnrollPass) { Die "Falta la clave: define `$env:WAZUH_ENROLL_PASSWORD antes de ejecutar." }

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  DSTAC EDR - Instalador de agente (Windows)"   -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Nombre del equipo: por -Nombre, o se pide aqui mismo en la consola
# (antes se pedia con una ventana emergente que podia quedar oculta detras
# de la consola tras la elevacion de UAC, y el script parecia "congelado"
# esperando una respuesta que el usuario nunca veia).
if (-not $Nombre) {
  $resp = Read-Host "Nombre para identificar este equipo [$env:COMPUTERNAME]"
  $Nombre = if ($resp) { $resp } else { $env:COMPUTERNAME }
}
# Sanitizar (sin espacios)
$Nombre = ($Nombre -replace '\s', '_') -replace '[^A-Za-z0-9_.-]', ''
if (-not $Nombre) { $Nombre = $env:COMPUTERNAME }

Write-Host "Equipo:  $Nombre"
Write-Host "Manager: $Manager"
if ($Empresa) { Write-Host "Empresa: $Empresa (auto-asignacion)" }
if ($Grupo)   { Write-Host "Grupo:   $Grupo" }

# Verificar conectividad al Manager (1514/1515). Se usa un TcpClient directo
# en vez de Test-NetConnection: este ultimo intenta antes un ping ICMP y
# puede tardar 10-20s POR PUERTO sin imprimir nada, lo que se ve igual que
# si el script estuviera congelado.
Write-Host "Verificando conectividad con $Manager (deberia tardar pocos segundos)..."
foreach ($p in 1514,1515) {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $ok = $false
  try {
    $task = $tcp.ConnectAsync($Manager, $p)
    $ok = $task.Wait(4000) -and $tcp.Connected
  } catch {} finally { $tcp.Close() }
  if ($ok) { Write-Host "  puerto $p alcanzable" -ForegroundColor Green }
  else { Die "  No se alcanza ${Manager}:$p - revisa el firewall de salida." }
}

# Descargar el MSI
$msi = Join-Path $env:TEMP "wazuh-agent-dstac.msi"
Write-Host "Descargando el agente (~6 MB, puede tardar segun tu conexion)..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $MsiUrl -OutFile $msi -UseBasicParsing
Write-Host "  descarga completa" -ForegroundColor Green

# Instalar silencioso, enrolando con nombre + manager + clave
Write-Host "Instalando y enrolando (silencioso, puede tardar 10-30s sin mostrar nada mas)..."
$mArgs = "/i `"$msi`" /q WAZUH_MANAGER=`"$Manager`" WAZUH_REGISTRATION_PASSWORD=`"$EnrollPass`" WAZUH_AGENT_NAME=`"$Nombre`""
if ($Grupo) { $mArgs += " WAZUH_AGENT_GROUP=`"$Grupo`"" }
$p = Start-Process msiexec.exe -ArgumentList $mArgs -Wait -PassThru
if ($p.ExitCode -ne 0) { Die "La instalacion fallo (msiexec codigo $($p.ExitCode))." }

# Etiqueta de empresa (auto-asignacion en el portal)
$conf = "C:\Program Files (x86)\ossec-agent\ossec.conf"
if ($Empresa -and (Test-Path $conf)) {
  $c = Get-Content $conf -Raw
  if ($c -notmatch "dstac_company") {
    $label = "  <labels>`r`n    <label key=""dstac_company"">$Empresa</label>`r`n  </labels>`r`n</ossec_config>"
    $c = $c -replace "</ossec_config>", $label
    Set-Content -Path $conf -Value $c -Encoding ASCII
  }
}

# Descubrimiento pasivo de red (tabla ARP, sin generar trafico): el panel EDR
# del portal muestra TODOS los dispositivos de la red, no solo los que tienen
# agente Wazuh. Corre cada minuto via wodle "command".
$scanDir = "C:\Program Files (x86)\ossec-agent\active-response\bin"
New-Item -ItemType Directory -Force -Path $scanDir | Out-Null
$scanScript = Join-Path $scanDir "dstac-network-scan.ps1"
@'
function Resolver-Nombre($ip) {
  try { return ([System.Net.Dns]::GetHostEntry($ip)).HostName } catch { return $null }
}
$items = @()
try {
  Get-NetNeighbor -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.LinkLayerAddress -match "^[0-9a-fA-F]{2}(-[0-9a-fA-F]{2}){5}$" } | ForEach-Object {
    $mac = ($_.LinkLayerAddress -replace "-", ":").ToUpper()
    $obj = [PSCustomObject]@{ ip = $_.IPAddress; mac = $mac }
    $host_ = Resolver-Nombre $_.IPAddress
    if ($host_) { $obj | Add-Member -NotePropertyName hostname -NotePropertyValue $host_ }
    $items += $obj
  }
} catch {
  arp -a | Select-String "(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F-]{17})" | ForEach-Object {
    $ip = $_.Matches[0].Groups[1].Value
    $mac = ($_.Matches[0].Groups[2].Value -replace "-", ":").ToUpper()
    $obj = [PSCustomObject]@{ ip = $ip; mac = $mac }
    $host_ = Resolver-Nombre $ip
    if ($host_) { $obj | Add-Member -NotePropertyName hostname -NotePropertyValue $host_ }
    $items += $obj
  }
}
$json = if ($items) { ($items | ConvertTo-Json -Compress) } else { "[]" }
Write-Output "DSTAC_NETSCAN {`"items`":$json}"
'@ | Set-Content -Path $scanScript -Encoding ASCII

if (Test-Path $conf) {
  $c = Get-Content $conf -Raw
  if ($c -notmatch "dstac_netscan") {
    $wodle = "  <wodle name=""command"">`r`n    <disabled>no</disabled>`r`n    <tag>dstac_netscan</tag>`r`n    <command>powershell.exe -ExecutionPolicy Bypass -File `"$scanScript`"</command>`r`n    <interval>1m</interval>`r`n    <ignore_output>no</ignore_output>`r`n    <run_on_start>yes</run_on_start>`r`n    <timeout>45</timeout>`r`n  </wodle>`r`n</ossec_config>"
    $c = $c -replace "</ossec_config>", $wodle
    Set-Content -Path $conf -Value $c -Encoding ASCII
  }
}

# Iniciar el servicio (nombre WazuhSvc en versiones recientes) y VERIFICAR
# que realmente quedó corriendo — no asumir éxito solo porque msiexec no
# devolvió error.
$svc = Get-Service -Name "WazuhSvc","Wazuh","OssecSvc" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($svc -and $svc.Status -ne "Running") {
  Restart-Service -Name $svc.Name -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
  $svc = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
}

if (-not $svc) {
  Die "No se encontro el servicio de Wazuh tras la instalacion (WazuhSvc/Wazuh/OssecSvc). Revisa manualmente."
}
if ($svc.Status -ne "Running") {
  Die "El servicio '$($svc.Name)' quedo en estado '$($svc.Status)', no 'Running'. Revisa: Get-Service $($svc.Name)"
}

Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Agente '$Nombre' instalado y activo ($($svc.Name): Running)" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
if ($Empresa) { Write-Host "Se auto-asignara a la empresa '$Empresa' en el portal." }
else { Write-Host "Asignalo a una empresa en el portal -> EDR." }
