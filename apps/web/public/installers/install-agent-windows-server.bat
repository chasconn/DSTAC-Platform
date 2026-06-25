@echo off
REM DSTAC EDR - Instalador de agente Wazuh para Windows Server
REM Este archivo .bat ejecuta el script PowerShell como Administrador automáticamente.

setlocal enabledelayedexpansion

REM Detectar si ya está corriendo como Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
  REM No es admin — crear un script temporal que se ejecute como admin
  powershell -NoProfile -Command ^
    "$ps = New-Object System.Diagnostics.ProcessStartInfo; " ^
    "$ps.FileName = 'powershell.exe'; " ^
    "$ps.Arguments = '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0install-agent-windows-server.ps1\" %*'; " ^
    "$ps.WorkingDirectory = '%cd%'; " ^
    "$ps.UseShellExecute = $true; " ^
    "$ps.Verb = 'runas'; " ^
    "[System.Diagnostics.Process]::Start($ps) | Out-Null; " ^
    "Start-Sleep -Seconds 1"
  exit /b 0
)

REM Ya es admin — ejecutar el script PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-agent-windows-server.ps1" %*
set errorcode=%errorlevel%

REM Pausa para ver errores si los hay
if %errorcode% neq 0 (
  echo.
  echo Presiona ENTER para cerrar...
  pause >nul
)

exit /b %errorcode%
