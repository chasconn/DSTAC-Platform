@echo off
REM DSTAC EDR - Instalador de agente Wazuh para Windows Server
REM Este archivo .bat ejecuta el script PowerShell como Administrador automáticamente.
REM
REM Uso (PowerShell):
REM   powershell -NoProfile -ExecutionPolicy Bypass -File "install-agent-windows-server.bat" -Nombre "DC01" -Empresa "acme"
REM
REM O desde CMD:
REM   install-agent-windows-server.bat

setlocal enabledelayedexpansion

REM Detectar si ya está corriendo como Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
  REM No es admin — re-ejecutar como admin
  echo Solicitando permisos de Administrador...
  powershell -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"%cd%\" ^& powershell -ExecutionPolicy Bypass -File \"%~dp0install-agent-windows-server.ps1\" %*' -Verb RunAs"
  exit /b
)

REM Ya es admin — ejecutar el script PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0install-agent-windows-server.ps1" %*
exit /b %errorlevel%
