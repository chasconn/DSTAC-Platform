<#
  DSTAC EDR - Instalador de agente Wazuh para Windows Server
  ------------------------------------------------------------
  Igual al instalador de Windows de escritorio, pero pensado para servidores:
  no asume sesion grafica (no intenta ventanas, sirve para Server Core),
  requiere el nombre por parametro o usa el nombre del equipo, e incluye el
  mismo descubrimiento pasivo de red (tabla ARP).

  Uso (PowerShell como Administrador):
    $env:WAZUH_ENROLL_PASSWORD="<clave>"
    powershell -ExecutionPolicy Bypass -File install-agent-windows-server.ps1 -Nombre "DC01" -Empresa "acme"

  Grupo Wazuh opcional:
    ... -File install-agent-windows-server.ps1 -Nombre "DC01" -Empresa "acme" -Grupo "servidores"
#>
param(
  [string]$Nombre  = "",
  [string]$Empresa = "",
  [string]$Grupo   = ""
)
$ErrorActionPreference = "Stop"

$Manager  = "2.25.183.242"
$MsiUrl   = "https://portal.dstac.cl/installers/wazuh-agent-4.14.5-1.msi"

$EnrollPass = $env:WAZUH_ENROLL_PASSWORD

function Die($m) {
  Write-Host $m -ForegroundColor Red
  Write-Host ""
  Write-Host "Presiona ENTER para cerrar..." -ForegroundColor Yellow
  Read-Host | Out-Null
  exit 1
}

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Die "Abre PowerShell como Administrador y vuelve a ejecutar." }
if (-not $EnrollPass) { Die "Falta la clave: define `$env:WAZUH_ENROLL_PASSWORD antes de ejecutar." }

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  DSTAC EDR - Instalador de agente (Windows Server)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Sin GUI: usa -Nombre o el nombre del equipo (no intenta ventanas, sirve en Server Core)
if (-not $Nombre) { $Nombre = $env:COMPUTERNAME }
$Nombre = ($Nombre -replace '\s', '_') -replace '[^A-Za-z0-9_.-]', ''
if (-not $Nombre) { $Nombre = $env:COMPUTERNAME }

Write-Host "Equipo:  $Nombre"
Write-Host "Manager: $Manager"
if ($Empresa) { Write-Host "Empresa: $Empresa (auto-asignacion)" }
if ($Grupo)   { Write-Host "Grupo:   $Grupo" }

foreach ($p in 1514,1515) {
  $ok = (Test-NetConnection -ComputerName $Manager -Port $p -WarningAction SilentlyContinue).TcpTestSucceeded
  if ($ok) { Write-Host "  puerto $p alcanzable" -ForegroundColor Green }
  else { Die "  No se alcanza ${Manager}:$p - revisa el firewall de salida (frecuente en servidores)." }
}

$msi = Join-Path $env:TEMP "wazuh-agent-dstac.msi"
Write-Host "Descargando el agente..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $MsiUrl -OutFile $msi -UseBasicParsing

Write-Host "Instalando y enrolando..."
$mArgs = "/i `"$msi`" /q WAZUH_MANAGER=`"$Manager`" WAZUH_REGISTRATION_PASSWORD=`"$EnrollPass`" WAZUH_AGENT_NAME=`"$Nombre`""
if ($Grupo) { $mArgs += " WAZUH_AGENT_GROUP=`"$Grupo`"" }
$p = Start-Process msiexec.exe -ArgumentList $mArgs -Wait -PassThru
if ($p.ExitCode -ne 0) { Die "La instalacion fallo (msiexec codigo $($p.ExitCode))." }

$conf = "C:\Program Files (x86)\ossec-agent\ossec.conf"
if ($Empresa -and (Test-Path $conf)) {
  $c = Get-Content $conf -Raw
  if ($c -notmatch "dstac_company") {
    $label = "  <labels>`r`n    <label key=""dstac_company"">$Empresa</label>`r`n  </labels>`r`n</ossec_config>"
    $c = $c -replace "</ossec_config>", $label
    Set-Content -Path $conf -Value $c -Encoding ASCII
  }
}

# Descubrimiento pasivo de red (tabla ARP) — igual que en el instalador de escritorio.
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

# Registrar el agente en el portal para que aparezca inmediatamente (sin esperar alertas)
try {
  $clientKeys = "C:\Program Files (x86)\ossec-agent\client.keys"
  if (Test-Path $clientKeys) {
    $line = Get-Content $clientKeys -First 1
    $parts = $line -split "\s+"
    $agentId = $parts[0]

    if ($agentId -and $agentId -match "^[0-9]+$") {
      Write-Host "Registrando agente en el portal..."
      $body = @{
        wazuh_id     = $agentId
        agent_name   = $Nombre
        agent_ip     = [System.Net.Dns]::GetHostAddresses($env:COMPUTERNAME)[0].IPAddressToString
        dstac_company = if ($Empresa) { $Empresa } else { $null }
      } | ConvertTo-Json

      $headers = @{
        "Content-Type" = "application/json"
        "x-edr-key"    = $env:EDR_WEBHOOK_SECRET
      }

      Invoke-WebRequest -Uri "https://portal.dstac.cl/api/edr/agentes/registrar" `
        -Method POST -Body $body -Headers $headers -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
      Write-Host "  agente registrado en el portal" -ForegroundColor Green
    }
  }
} catch {
  # No fallar si el registro en el portal no funciona; el webhook lo hará cuando lleguen alertas
}

if ($Empresa) { Write-Host "Se auto-asignara a la empresa '$Empresa' en el portal." }
else { Write-Host "Asignalo a una empresa en el portal -> EDR." }
