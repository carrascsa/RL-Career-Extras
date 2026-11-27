@echo off
rem RL Career Extras - installer.
rem Copies the add-on to %LOCALAPPDATA%\RLCareerExtras, remembers where RL Career Hub is installed
rem and puts a "RL Career Extras" shortcut on the desktop. It never modifies RL Career Hub itself.
rem
rem   INSTALL.cmd                      find RL Career Hub automatically
rem   INSTALL.cmd "D:\Games\RL Career Hub\RL Career Hub.exe"   use this RL Career Hub
rem   INSTALL.cmd /noshortcut          do not create the desktop shortcut
setlocal EnableExtensions
title RL Career Extras - Installer
rem the folder of this file (%~dp0) changes after "shift": remember it first
set "HERE=%~dp0"
set "SRC=%HERE%app"
set "DEST=%LOCALAPPDATA%\RLCareerExtras"
if defined RLCX_INSTALL_DIR set "DEST=%RLCX_INSTALL_DIR%"
set "SHORTCUT=1"
set "HUB="
:args
if "%~1"=="" goto args_done
if /I "%~1"=="/noshortcut" (set "SHORTCUT=0") else (set "HUB=%~1")
shift
goto args
:args_done

echo.
echo  ============================================
echo    RL Career Extras - installer
echo  ============================================
echo.

if not exist "%SRC%\src\inproc.js" (
  echo  [!] The "app" folder is missing. Extract the whole zip first, then run INSTALL.cmd again.
  goto fail
)

rem ---- 1. Find RL Career Hub ------------------------------------------------
if defined HUB if not exist "%HUB%" (
  echo  [!] Not found: %HUB%
  set "HUB="
)
if not defined HUB if exist "%LOCALAPPDATA%\Programs\RL Career Hub\RL Career Hub.exe" set "HUB=%LOCALAPPDATA%\Programs\RL Career Hub\RL Career Hub.exe"
if not defined HUB if exist "%ProgramFiles%\RL Career Hub\RL Career Hub.exe" set "HUB=%ProgramFiles%\RL Career Hub\RL Career Hub.exe"
if not defined HUB if exist "%HERE%..\RL Career Hub.exe" set "HUB=%HERE%..\RL Career Hub.exe"
if not defined HUB (
  rem Windows keeps the install folder of RL Career Hub in its "Apps" list.
  for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$k='HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'; Get-ItemProperty $k -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'RL Career Hub*' } | ForEach-Object { if ($_.InstallLocation) { Join-Path $_.InstallLocation 'RL Career Hub.exe' }; if ($_.DisplayIcon) { ($_.DisplayIcon -replace ',\d+$','').Trim([char]34) }; if ($_.UninstallString) { Join-Path (Split-Path ($_.UninstallString -replace '^\x22([^\x22]+)\x22.*$','$1')) 'RL Career Hub.exe' } } | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1"`) do set "HUB=%%P"
)
if not defined HUB (
  echo  Could not find RL Career Hub automatically.
  echo  Paste the full path of "RL Career Hub.exe" and press Enter
  echo  ^(for example: D:\Games\RL Career Hub\RL Career Hub.exe^)
  echo.
  set /p "HUB=  Path: "
)
if defined HUB set "HUB=%HUB:"=%"
if not defined HUB goto nohub
if not exist "%HUB%" goto nohub
for %%F in ("%HUB%") do set "HUBDIR=%%~dpF"
echo  RL Career Hub found: %HUB%
if not exist "%HUBDIR%resources\python\python.exe" (
  echo  [i] This RL Career Hub has no bundled Python: everything works except the live caster.
)

rem ---- 2. Copy the add-on ---------------------------------------------------
echo  Installing to: %DEST%
if not exist "%DEST%" mkdir "%DEST%"
robocopy "%SRC%" "%DEST%" /MIR /NFL /NDL /NJH /NJS /NP /XF hub-path.txt >nul
if errorlevel 8 (
  echo  [!] Could not copy the files to %DEST%.
  goto fail
)
copy /Y "%HERE%UNINSTALL.cmd" "%DEST%\UNINSTALL.cmd" >nul
copy /Y "%HERE%README.md" "%DEST%\README.md" >nul
> "%DEST%\hub-path.txt" (echo %HUB%)

rem ---- 3. Desktop shortcut ----------------------------------------------------
if "%SHORTCUT%"=="1" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\RL Career Extras.lnk'); $s.TargetPath='%DEST%\Start RL Career Extras.cmd'; $s.WorkingDirectory='%DEST%'; $s.IconLocation='%HUB%,0'; $s.Description='RL Career Hub with RL Career Extras'; $s.Save()" >nul 2>&1
  if errorlevel 1 (echo  [i] Could not create the desktop shortcut. Start the game with "%DEST%\Start RL Career Extras.cmd".) else (echo  Desktop shortcut created: RL Career Extras)
)

echo.
echo  Done! Close RL Career Hub if it is open, then start it with the
echo  "RL Career Extras" shortcut on your desktop.
echo  Log file for bug reports: %%TEMP%%\rlcareerextras.log
echo.
if not defined RLCX_NO_PAUSE pause
exit /b 0

:nohub
echo  [!] RL Career Hub was not found. Install RL Career Hub first, or run:
echo      INSTALL.cmd "C:\full\path\to\RL Career Hub.exe"
:fail
echo.
if not defined RLCX_NO_PAUSE pause
exit /b 1
