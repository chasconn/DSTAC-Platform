@echo off
REM DSTAC EDR - Instalador de agente Wazuh para Windows
REM Solo doble clic: abre la app grafica del instalador (sin consola visible).
start "" /min powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0install-agent-windows.ps1"
exit
