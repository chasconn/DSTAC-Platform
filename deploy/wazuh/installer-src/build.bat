@echo off
REM Compila el instalador grafico de DSTAC EDR a un .exe nativo.
REM Requiere csc.exe (incluido en .NET Framework, presente en todo Windows).
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"

"%CSC%" /target:winexe /platform:x64 /out:DstacEdrInstaller.exe /win32manifest:app.manifest /reference:System.dll /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.ServiceProcess.dll Program.cs

if exist DstacEdrInstaller.exe (
  echo.
  echo Compilado: DstacEdrInstaller.exe
  echo Copialo a apps\web\public\installers\ para distribuirlo.
)
