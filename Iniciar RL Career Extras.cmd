@echo off
rem RL Career Extras - starts RL Career Hub with the add-on (Hall of Fame, Academy, Club Life) and RL Career+ if installed.
setlocal
set "HUB="
if exist "%~dp0hub-path.txt" set /p HUB=<"%~dp0hub-path.txt"
if not defined HUB if exist "%~dp0..\RL Career Hub.exe" set "HUB=%~dp0..\RL Career Hub.exe"
if not defined HUB if exist "C:\Program Files\RL Career Hub\RL Career Hub.exe" set "HUB=C:\Program Files\RL Career Hub\RL Career Hub.exe"
if not defined HUB if exist "%LOCALAPPDATA%\Programs\RL Career Hub\RL Career Hub.exe" set "HUB=%LOCALAPPDATA%\Programs\RL Career Hub\RL Career Hub.exe"
if not defined HUB (
  echo No encuentro "RL Career Hub.exe". Escribi su ruta completa en hub-path.txt, al lado de este archivo.
  pause
  exit /b 1
)

tasklist /FI "IMAGENAME eq RL Career Hub.exe" 2>nul | find /I "RL Career Hub.exe" >nul
if not errorlevel 1 (
  echo RL Career Hub ya esta abierto. Cerralo y volve a ejecutar este archivo.
  pause
  exit /b 1
)

echo Iniciando RL Career Hub con RL Career Extras...
set ELECTRON_RUN_AS_NODE=1
"%HUB%" "%~dp0src\launcher.js" "%HUB%" %*
if errorlevel 1 (
  echo.
  echo No se pudo activar el addon. Mira el log en %TEMP%\rlcareerextras.log
  pause
  exit /b 1
)
exit /b 0
