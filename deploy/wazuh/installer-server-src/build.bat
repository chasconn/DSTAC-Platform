@echo off
REM Compila el instalador de DSTAC EDR para Windows Server a un .exe nativo.
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"

"%CSC%" /target:exe /platform:x64 /out:DstacEdrInstallerServer.exe /win32manifest:app.manifest /reference:System.dll /reference:System.ServiceProcess.dll Program.cs AssemblyInfo.cs

if exist DstacEdrInstallerServer.exe (
  echo.
  echo Compilado: DstacEdrInstallerServer.exe
  echo Copialo a apps\web\public\installers\ para distribuirlo.
)
