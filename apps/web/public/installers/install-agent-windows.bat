@echo off
REM DSTAC EDR - Instalador de agente Wazuh para Windows
REM Solo doble clic — se ejecuta automáticamente como admin

setlocal enabledelayedexpansion

REM Detectar si ya está corriendo como Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
  REM No es admin — re-ejecutar como admin con la clave
  powershell -NoProfile -Command ^
    "Start-Process powershell -ArgumentList ^"-NoProfile -ExecutionPolicy Bypass -Command `$env:WAZUH_ENROLL_PASSWORD='dc36d4d470f23469a0b8613dc62351a0'; ^& '%~dp0install-agent-windows.ps1'^\" -Verb RunAs"
  exit /b 0
)

REM Ya es admin — ejecutar el script con la clave seteada
powershell -NoProfile -Command "$env:WAZUH_ENROLL_PASSWORD='dc36d4d470f23469a0b8613dc62351a0'; & '%~dp0install-agent-windows.ps1'"
set errorcode=%errorlevel%

REM Pausa para ver errores si los hay
if %errorcode% neq 0 (
  echo.
  echo Presiona ENTER para cerrar...
  pause >nul
)

exit /b %errorcode%
