<#
  DSTAC EDR - Instalador de agente Wazuh para Windows (interfaz grafica)
  -----------------------------------------------------------------------
  Aplicacion de escritorio: el usuario elige la empresa de una lista (cargada
  en vivo desde el portal) y escribe un nombre para identificar el equipo.
  El instalador hace todo lo demas solo: descarga, enrola y se registra en
  el portal para que aparezca de inmediato en EDR.
#>
param(
  [string]$Nombre  = "",
  [string]$Empresa = "",
  [string]$Grupo   = ""
)
$ErrorActionPreference = "Stop"

# ===== Configuracion DSTAC =====
$Manager  = "2.25.183.242"
$MsiUrl   = "https://portal.dstac.cl/installers/wazuh-agent-4.14.5-1.msi"
$ApiBase  = "https://portal.dstac.cl/api/edr"
# ===============================

# Claves por defecto (para que la app funcione con solo doble clic, sin pasos
# adicionales). Se pueden sobreescribir por entorno si se necesita otra clave.
$EnrollPass = $env:WAZUH_ENROLL_PASSWORD
if (-not $EnrollPass) { $EnrollPass = "dc36d4d470f23469a0b8613dc62351a0" }
$EdrKey = $env:EDR_WEBHOOK_SECRET
if (-not $EdrKey) { $EdrKey = "e2080355efb4666a64a24288afe29172b5de93733c07373a" }

# Auto-elevacion: si no es Administrador, se relanza a si mismo con UAC (consola
# oculta; los mensajes se muestran en la ventana grafica) y termina este proceso.
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  $argList = @("-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"")
  foreach ($k in $PSBoundParameters.Keys) { $argList += "-$k"; $argList += "`"$($PSBoundParameters[$k])`"" }
  Start-Process powershell -ArgumentList $argList -Verb RunAs
  exit 0
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

# Devuelve la lista de empresas, o $null + el motivo del fallo en $script:EmpresasError
# (para poder mostrar la causa real en vez de tragarla en silencio).
$script:EmpresasError = $null
function Get-Empresas {
  try {
    $headers = @{ "x-edr-key" = $EdrKey }
    $resp = Invoke-RestMethod -Uri "$ApiBase/empresas" -Headers $headers -TimeoutSec 8
    return $resp.empresas
  } catch {
    $script:EmpresasError = $_.Exception.Message
    return @()
  }
}

# Colores DSTAC (tema oscuro)
$colFondo  = [System.Drawing.Color]::FromArgb(15, 23, 32)
$colCampo  = [System.Drawing.Color]::White
$colTexto  = [System.Drawing.Color]::White
$colSub    = [System.Drawing.Color]::FromArgb(150, 165, 180)
$colAcento = [System.Drawing.Color]::FromArgb(0, 153, 204)

# ===== Ventana principal =====
$form = New-Object System.Windows.Forms.Form
$form.Text = "DSTAC EDR - Instalador de agente"
$form.ClientSize = New-Object System.Drawing.Size(460, 520)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::None
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.BackColor = $colFondo

$lblTitulo = New-Object System.Windows.Forms.Label
$lblTitulo.Text = "DSTAC EDR"
$lblTitulo.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$lblTitulo.ForeColor = $colTexto
$lblTitulo.Location = New-Object System.Drawing.Point(25, 20)
$lblTitulo.Size = New-Object System.Drawing.Size(410, 36)
$form.Controls.Add($lblTitulo)

$lblSub = New-Object System.Windows.Forms.Label
$lblSub.Text = "Instalador de agente de proteccion de endpoint"
$lblSub.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$lblSub.Location = New-Object System.Drawing.Point(25, 58)
$lblSub.Size = New-Object System.Drawing.Size(410, 20)
$lblSub.ForeColor = $colSub
$form.Controls.Add($lblSub)

$lblEmpresa = New-Object System.Windows.Forms.Label
$lblEmpresa.Text = "Empresa:"
$lblEmpresa.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$lblEmpresa.ForeColor = $colTexto
$lblEmpresa.Location = New-Object System.Drawing.Point(25, 100)
$lblEmpresa.Size = New-Object System.Drawing.Size(200, 20)
$form.Controls.Add($lblEmpresa)

$comboEmpresa = New-Object System.Windows.Forms.ComboBox
$comboEmpresa.Location = New-Object System.Drawing.Point(25, 123)
$comboEmpresa.Size = New-Object System.Drawing.Size(410, 26)
$comboEmpresa.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$comboEmpresa.DropDownStyle = "DropDown"  # editable: si la lista no carga, se puede escribir el nombre/slug a mano
$comboEmpresa.BackColor = $colCampo
$form.Controls.Add($comboEmpresa)

$lblEmpresaEstado = New-Object System.Windows.Forms.Label
$lblEmpresaEstado.Text = "Cargando lista de empresas..."
$lblEmpresaEstado.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$lblEmpresaEstado.ForeColor = $colSub
$lblEmpresaEstado.Location = New-Object System.Drawing.Point(25, 152)
$lblEmpresaEstado.Size = New-Object System.Drawing.Size(410, 32)
$form.Controls.Add($lblEmpresaEstado)

$lblNombre = New-Object System.Windows.Forms.Label
$lblNombre.Text = "Nombre para identificar este equipo:"
$lblNombre.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$lblNombre.ForeColor = $colTexto
$lblNombre.Location = New-Object System.Drawing.Point(25, 192)
$lblNombre.Size = New-Object System.Drawing.Size(410, 20)
$form.Controls.Add($lblNombre)

$txtNombre = New-Object System.Windows.Forms.TextBox
$txtNombre.Location = New-Object System.Drawing.Point(25, 215)
$txtNombre.Size = New-Object System.Drawing.Size(410, 26)
$txtNombre.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$txtNombre.BackColor = $colCampo
$txtNombre.Text = if ($Nombre) { $Nombre } else { $env:COMPUTERNAME }
$form.Controls.Add($txtNombre)

$btnInstalar = New-Object System.Windows.Forms.Button
$btnInstalar.Text = "Instalar"
$btnInstalar.Location = New-Object System.Drawing.Point(25, 258)
$btnInstalar.Size = New-Object System.Drawing.Size(410, 42)
$btnInstalar.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnInstalar.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnInstalar.BackColor = $colAcento
$btnInstalar.ForeColor = [System.Drawing.Color]::White
$btnInstalar.FlatAppearance.BorderSize = 0
$form.Controls.Add($btnInstalar)

$lblLog = New-Object System.Windows.Forms.Label
$lblLog.Text = "Detalle:"
$lblLog.Font = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$lblLog.ForeColor = $colSub
$lblLog.Location = New-Object System.Drawing.Point(25, 312)
$lblLog.Size = New-Object System.Drawing.Size(200, 18)
$form.Controls.Add($lblLog)

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Location = New-Object System.Drawing.Point(25, 333)
$txtLog.Size = New-Object System.Drawing.Size(410, 165)
$txtLog.Multiline = $true
$txtLog.ScrollBars = "Vertical"
$txtLog.ReadOnly = $true
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 9)
$txtLog.BackColor = [System.Drawing.Color]::FromArgb(10, 14, 20)
$txtLog.ForeColor = [System.Drawing.Color]::FromArgb(180, 220, 180)
$txtLog.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
$form.Controls.Add($txtLog)

function Log($msg) {
  $txtLog.AppendText("$msg`r`n")
  $txtLog.SelectionStart = $txtLog.Text.Length
  $txtLog.ScrollToCaret()
  [System.Windows.Forms.Application]::DoEvents()
}

function Fail($msg) {
  Log "ERROR: $msg"
  [System.Windows.Forms.MessageBox]::Show($msg, "DSTAC EDR - Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
  $btnInstalar.Enabled = $true
}

# Cargar la lista de empresas en vivo desde el portal (con mapeo nombre -> slug)
$empresaMap = @{}
$empresas = Get-Empresas
if ($empresas -and $empresas.Count -gt 0) {
  foreach ($e in $empresas) {
    [void]$comboEmpresa.Items.Add($e.name)
    $empresaMap[$e.name] = $e.slug
  }
  if ($Empresa -and $empresaMap.Values -contains $Empresa) {
    $nombreEmpresa = ($empresaMap.GetEnumerator() | Where-Object { $_.Value -eq $Empresa } | Select-Object -First 1).Key
    $comboEmpresa.Text = $nombreEmpresa
  } else {
    $comboEmpresa.SelectedIndex = 0
  }
  $lblEmpresaEstado.Text = "$($empresas.Count) empresa(s) disponible(s)."
} else {
  $comboEmpresa.Text = if ($Empresa) { $Empresa } else { "" }
  $motivo = if ($script:EmpresasError) { $script:EmpresasError } else { "respuesta vacia" }
  $lblEmpresaEstado.Text = "No se pudo cargar la lista ($motivo). Escribe el nombre/slug de la empresa."
  $lblEmpresaEstado.ForeColor = [System.Drawing.Color]::FromArgb(230, 120, 80)
}

$btnInstalar.Add_Click({
  $btnInstalar.Enabled = $false
  $txtLog.Clear()

  $nombreEquipo = $txtNombre.Text.Trim()
  if (-not $nombreEquipo) { $nombreEquipo = $env:COMPUTERNAME }
  $nombreEquipo = ($nombreEquipo -replace '\s', '_') -replace '[^A-Za-z0-9_.-]', ''
  if (-not $nombreEquipo) { $nombreEquipo = $env:COMPUTERNAME }

  $empresaTexto = $comboEmpresa.Text.Trim()
  $empresaSlug = $null
  if ($empresaMap.ContainsKey($empresaTexto)) { $empresaSlug = $empresaMap[$empresaTexto] }
  elseif ($empresaTexto) { $empresaSlug = $empresaTexto }

  if (-not $empresaSlug) {
    Fail "Selecciona o escribe una empresa valida."
    return
  }

  try {
    Log "Equipo:  $nombreEquipo"
    Log "Empresa: $empresaSlug"
    Log "Manager: $Manager"
    Log ""

    Log "Verificando conectividad..."
    foreach ($p in 1514, 1515) {
      $tcp = New-Object System.Net.Sockets.TcpClient
      $ok = $false
      try {
        $task = $tcp.ConnectAsync($Manager, $p)
        $ok = $task.Wait(4000) -and $tcp.Connected
      } catch {} finally { $tcp.Close() }
      if ($ok) { Log "  puerto $p alcanzable" }
      else { throw "No se alcanza ${Manager}:$p - revisa el firewall de salida." }
    }

    $msi = Join-Path $env:TEMP "wazuh-agent-dstac.msi"
    Log "Descargando el agente (~6 MB)..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $MsiUrl -OutFile $msi -UseBasicParsing
    Log "  descarga completa"

    Log "Instalando y enrolando (puede tardar 10-30s)..."
    $mArgs = "/i `"$msi`" /q WAZUH_MANAGER=`"$Manager`" WAZUH_REGISTRATION_PASSWORD=`"$EnrollPass`" WAZUH_AGENT_NAME=`"$nombreEquipo`""
    if ($Grupo) { $mArgs += " WAZUH_AGENT_GROUP=`"$Grupo`"" }
    $p = Start-Process msiexec.exe -ArgumentList $mArgs -Wait -PassThru
    if ($p.ExitCode -ne 0) { throw "La instalacion fallo (msiexec codigo $($p.ExitCode))." }
    Log "  msiexec OK"

    # Etiqueta de empresa (auto-asignacion en el portal)
    $conf = "C:\Program Files (x86)\ossec-agent\ossec.conf"
    if (Test-Path $conf) {
      $c = Get-Content $conf -Raw
      if ($c -notmatch "dstac_company") {
        $label = "  <labels>`r`n    <label key=""dstac_company"">$empresaSlug</label>`r`n  </labels>`r`n</ossec_config>"
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

    Log "Verificando el servicio..."
    $svc = Get-Service -Name "WazuhSvc", "Wazuh", "OssecSvc" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($svc -and $svc.Status -ne "Running") {
      Restart-Service -Name $svc.Name -ErrorAction SilentlyContinue
      Start-Sleep -Seconds 3
      $svc = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
    }
    if (-not $svc) { throw "No se encontro el servicio de Wazuh tras la instalacion." }
    if ($svc.Status -ne "Running") { throw "El servicio '$($svc.Name)' quedo en estado '$($svc.Status)', no 'Running'." }
    Log "  servicio activo ($($svc.Name): Running)"

    # Registrar el agente en el portal para que aparezca inmediatamente (sin esperar alertas)
    Log "Registrando en el portal..."
    try {
      $clientKeys = "C:\Program Files (x86)\ossec-agent\client.keys"
      if (Test-Path $clientKeys) {
        $line = Get-Content $clientKeys -First 1
        $agentId = ($line -split "\s+")[0]
        if ($agentId -match "^[0-9]+$") {
          $ip = ([System.Net.Dns]::GetHostAddresses($env:COMPUTERNAME) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1).IPAddressToString
          $body = @{ wazuh_id = $agentId; agent_name = $nombreEquipo; agent_ip = $ip; dstac_company = $empresaSlug } | ConvertTo-Json
          Invoke-RestMethod -Uri "$ApiBase/agentes/registrar" -Method POST -Body $body -ContentType "application/json" -Headers @{ "x-edr-key" = $EdrKey } -TimeoutSec 10 | Out-Null
          Log "  agente registrado en el portal"
        } else {
          Log "  aviso: no se pudo leer el ID del agente; aparecera al recibir su primera alerta"
        }
      }
    } catch {
      Log "  aviso: no se pudo confirmar el registro en el portal ($($_.Exception.Message))"
    }

    Log ""
    Log "Listo. Agente '$nombreEquipo' instalado y asignado a '$empresaSlug'."
    [System.Windows.Forms.MessageBox]::Show("Instalacion completa.`n`nEl equipo '$nombreEquipo' ya esta protegido por DSTAC EDR.", "DSTAC EDR", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
    $btnInstalar.Text = "Instalado"
  } catch {
    Fail $_.Exception.Message
  }
})

[void]$form.ShowDialog()
