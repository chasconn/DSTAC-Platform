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
#>
param(
  [string]$Nombre  = "",
  [string]$Empresa = ""
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

# Nombre del equipo: por -Nombre, o con una ventana
if (-not $Nombre) {
  Add-Type -AssemblyName Microsoft.VisualBasic
  $Nombre = [Microsoft.VisualBasic.Interaction]::InputBox("Escribe un nombre para identificar este equipo:", "DSTAC EDR", $env:COMPUTERNAME)
  if (-not $Nombre) { $Nombre = $env:COMPUTERNAME }
}
# Sanitizar (sin espacios)
$Nombre = ($Nombre -replace '\s', '_') -replace '[^A-Za-z0-9_.-]', ''
if (-not $Nombre) { $Nombre = $env:COMPUTERNAME }

Write-Host "Equipo:  $Nombre"
Write-Host "Manager: $Manager"
if ($Empresa) { Write-Host "Empresa: $Empresa (auto-asignacion)" }

# Verificar conectividad al Manager (1514/1515)
foreach ($p in 1514,1515) {
  $ok = (Test-NetConnection -ComputerName $Manager -Port $p -WarningAction SilentlyContinue).TcpTestSucceeded
  if ($ok) { Write-Host "  puerto $p alcanzable" -ForegroundColor Green }
  else { Die "  No se alcanza ${Manager}:$p - revisa el firewall de salida." }
}

# Descargar el MSI
$msi = Join-Path $env:TEMP "wazuh-agent-dstac.msi"
Write-Host "Descargando el agente..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $MsiUrl -OutFile $msi -UseBasicParsing

# Instalar silencioso, enrolando con nombre + manager + clave
Write-Host "Instalando y enrolando..."
$mArgs = "/i `"$msi`" /q WAZUH_MANAGER=`"$Manager`" WAZUH_REGISTRATION_PASSWORD=`"$EnrollPass`" WAZUH_AGENT_NAME=`"$Nombre`""
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

# Iniciar el servicio (nombre WazuhSvc en versiones recientes)
$svc = Get-Service -Name "WazuhSvc","Wazuh","OssecSvc" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($svc) { Restart-Service -Name $svc.Name -ErrorAction SilentlyContinue }

Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Agente '$Nombre' instalado y enrolado." -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
if ($Empresa) { Write-Host "Se auto-asignara a la empresa '$Empresa' en el portal." }
else { Write-Host "Asignalo a una empresa en el portal -> EDR." }
