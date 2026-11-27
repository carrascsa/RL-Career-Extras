@echo off
rem RL Career Extras - uninstaller. Removes the add-on and its desktop shortcut.
rem Your careers are not touched: RL Career Hub simply ignores the add-on's data once it is gone.
setlocal EnableExtensions
title RL Career Extras - Uninstall
set "DEST=%LOCALAPPDATA%\RLCareerExtras"
if defined RLCX_INSTALL_DIR set "DEST=%RLCX_INSTALL_DIR%"

rem Running from inside the folder that is about to be deleted: continue from a copy in %TEMP%.
if /I "%~dp0"=="%DEST%\" (
  copy /Y "%~f0" "%TEMP%\rlcx-uninstall.cmd" >nul
  cd /d "%TEMP%"
  "%TEMP%\rlcx-uninstall.cmd"
)

echo.
echo  This removes RL Career Extras from %DEST%
echo  and the "RL Career Extras" desktop shortcut. Your saves are kept.
echo.
if not defined RLCX_NO_PAUSE (
  choice /C YN /M "  Continue"
  if errorlevel 2 exit /b 0
)
powershell -NoProfile -Command "Remove-Item -LiteralPath ([Environment]::GetFolderPath('Desktop')+'\RL Career Extras.lnk') -ErrorAction SilentlyContinue" >nul 2>&1
cd /d "%TEMP%"
if exist "%DEST%" rmdir /S /Q "%DEST%"
if exist "%DEST%" (
  echo  [!] Some files could not be removed. Close RL Career Hub and run this again.
) else (
  echo  RL Career Extras was removed. Start RL Career Hub normally from now on.
)
echo.
if not defined RLCX_NO_PAUSE pause
exit /b 0
