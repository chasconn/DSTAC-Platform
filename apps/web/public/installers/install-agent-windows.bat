@echo off
REM DSTAC EDR - Instalador de agente Wazuh para Windows
REM Solo doble clic — se ejecuta automáticamente como admin

setlocal enabledelayedexpansion

REM Setear la clave de enrolamiento (no pedir al usuario)
set WAZUH_ENROLL_PASSWORD=dc36d4d470f23469a0b8613dc62351a0

REM Detectar si ya está corriendo como Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
  REM No es admin — re-ejecutar como admin
  powershell -NoProfile -Command ^
    "$ps = New-Object System.Diagnostics.ProcessStartInfo; " ^
    "$ps.FileName = 'powershell.exe'; " ^
    "$ps.Arguments = '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0install-agent-windows.ps1\" -Empresa \"%EMPRESA%\"'; " ^
    "$ps.EnvironmentVariables['WAZUH_ENROLL_PASSWORD'] = '%WAZUH_ENROLL_PASSWORD%'; " ^
    "$ps.WorkingDirectory = '%cd%'; " ^
    "$ps.UseShellExecute = $true; " ^
    "$ps.Verb = 'runas'; " ^
    "[System.Diagnostics.Process]::Start($ps) | Out-Null; " ^
    "Start-Sleep -Seconds 1"
  exit /b 0
)

REM Ya es admin — ejecutar el script PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-agent-windows.ps1" -Empresa "%EMPRESA%"
set errorcode=%errorlevel%

REM Pausa para ver errores si los hay
if %errorcode% neq 0 (
  echo.
  echo Presiona ENTER para cerrar...
  pause >nul
)

exit /b %errorcode%
