@echo off
REM DSTAC EDR - Instalador de agente Wazuh para Windows
REM Archivo unico y autosuficiente: descarga siempre la ultima version del
REM instalador grafico desde el portal y la ejecuta. No depende de ningun
REM otro archivo junto a este .bat.
setlocal
set "PS1=%TEMP%\dstac-edr-installer.ps1"

echo DSTAC EDR - preparando el instalador...
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'https://portal.dstac.cl/installers/install-agent-windows.ps1' -OutFile '%PS1%' -UseBasicParsing } catch { exit 1 }"
if errorlevel 1 (
  echo.
  echo No se pudo descargar el instalador. Verifica tu conexion a internet e intenta de nuevo.
  echo.
  pause
  exit /b 1
)
if not exist "%PS1%" (
  echo.
  echo No se pudo descargar el instalador.
  echo.
  pause
  exit /b 1
)

start "" /min powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%PS1%"
exit
