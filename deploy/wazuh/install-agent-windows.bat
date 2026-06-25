@echo off
REM DSTAC EDR - Instalador de agente Wazuh para Windows
REM Solo doble clic. El propio .ps1 se autoeleva a Administrador (UAC) si falta.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-agent-windows.ps1"
set errorcode=%errorlevel%

if %errorcode% neq 0 (
  echo.
  echo Presiona ENTER para cerrar...
  pause >nul
)

exit /b %errorcode%
