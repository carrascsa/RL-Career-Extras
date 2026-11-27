@echo off
rem RL Career Extras - starts RL Career Hub with the add-on (and RL Career+ if it is installed).
rem   Start RL Career Extras.cmd --no-careerplus   start without RL Career+
rem   Start RL Career Extras.cmd --force           try with an untested RL Career Hub version
setlocal
title RL Career Extras
set "HUB="
if exist "%~dp0hub-path.txt" set /p HUB=<"%~dp0hub-path.txt"
if defined HUB if not exist "%HUB%" set "HUB="
if not defined HUB if exist "%LOCALAPPDATA%\Programs\RL Career Hub\RL Career Hub.exe" set "HUB=%LOCALAPPDATA%\Programs\RL Career Hub\RL Career Hub.exe"
if not defined HUB if exist "%ProgramFiles%\RL Career Hub\RL Career Hub.exe" set "HUB=%ProgramFiles%\RL Career Hub\RL Career Hub.exe"
if not defined HUB if exist "%~dp0..\RL Career Hub.exe" set "HUB=%~dp0..\RL Career Hub.exe"
if not defined HUB (
  echo RL Career Hub.exe was not found. Run INSTALL.cmd again, or write its full path in:
  echo   %~dp0hub-path.txt
  pause
  exit /b 1
)

tasklist /FI "IMAGENAME eq RL Career Hub.exe" 2>nul | find /I "RL Career Hub.exe" >nul
if not errorlevel 1 (
  echo RL Career Hub is already open. Close it and start it again from this shortcut.
  pause
  exit /b 1
)

echo Starting RL Career Hub with RL Career Extras...
set ELECTRON_RUN_AS_NODE=1
"%HUB%" "%~dp0src\launcher.js" "%HUB%" %*
if errorlevel 1 (
  echo.
  echo The add-on could not be activated. Details: %TEMP%\rlcareerextras.log
  pause
  exit /b 1
)
exit /b 0
