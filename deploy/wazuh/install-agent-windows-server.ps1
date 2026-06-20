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
#>
param(
  [string]$Nombre  = "",
  [string]$Empresa = ""
)
$ErrorActionPreference = "Stop"

$Manager  = "2.25.183.242"
$MsiUrl   = "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.5-1.msi"

$EnrollPass = $env:WAZUH_ENROLL_PASSWORD

function Die($m) { Write-Host $m -ForegroundColor Red; exit 1 }

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
$items = @()
try {
  Get-NetNeighbor -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.LinkLayerAddress -match "^[0-9a-fA-F]{2}(-[0-9a-fA-F]{2}){5}$" } | ForEach-Object {
    $mac = ($_.LinkLayerAddress -replace "-", ":").ToUpper()
    $items += [PSCustomObject]@{ ip = $_.IPAddress; mac = $mac }
  }
} catch {
  arp -a | Select-String "(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F-]{17})" | ForEach-Object {
    $ip = $_.Matches[0].Groups[1].Value
    $mac = ($_.Matches[0].Groups[2].Value -replace "-", ":").ToUpper()
    $items += [PSCustomObject]@{ ip = $ip; mac = $mac }
  }
}
$json = if ($items) { ($items | ConvertTo-Json -Compress) } else { "[]" }
Write-Output "DSTAC_NETSCAN {`"items`":$json}"
'@ | Set-Content -Path $scanScript -Encoding ASCII

if (Test-Path $conf) {
  $c = Get-Content $conf -Raw
  if ($c -notmatch "dstac_netscan") {
    $wodle = "  <wodle name=""command"">`r`n    <disabled>no</disabled>`r`n    <tag>dstac_netscan</tag>`r`n    <command>powershell.exe -ExecutionPolicy Bypass -File `"$scanScript`"</command>`r`n    <interval>1m</interval>`r`n    <ignore_output>no</ignore_output>`r`n    <run_on_start>yes</run_on_start>`r`n    <timeout>20</timeout>`r`n  </wodle>`r`n</ossec_config>"
    $c = $c -replace "</ossec_config>", $wodle
    Set-Content -Path $conf -Value $c -Encoding ASCII
  }
}

$svc = Get-Service -Name "WazuhSvc","Wazuh","OssecSvc" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($svc) { Restart-Service -Name $svc.Name -ErrorAction SilentlyContinue }

Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Agente '$Nombre' instalado y enrolado." -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
if ($Empresa) { Write-Host "Se auto-asignara a la empresa '$Empresa' en el portal." }
else { Write-Host "Asignalo a una empresa en el portal -> EDR." }
