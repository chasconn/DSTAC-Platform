@echo off
REM DSTAC EDR - Instalador de agente Wazuh para Windows
REM Este archivo .bat ejecuta el script PowerShell como Administrador automáticamente.
REM
REM Uso:
REM   install-agent-windows.bat
REM   (o doble clic desde el Explorador)
REM
REM Variables de entorno (opcional):
REM   set WAZUH_ENROLL_PASSWORD=<clave>
REM   install-agent-windows.bat

setlocal enabledelayedexpansion

REM Detectar si ya está corriendo como Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
  REM No es admin — re-ejecutar como admin
  echo Solicitando permisos de Administrador...
  powershell -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"%cd%\" ^& powershell -ExecutionPolicy Bypass -File \"%~dp0install-agent-windows.ps1\" %*' -Verb RunAs"
  exit /b
)

REM Ya es admin — ejecutar el script PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0install-agent-windows.ps1" %*
exit /b %errorlevel%
