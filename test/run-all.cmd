@echo off
rem Runs every RL Career Extras test. Saves are only read.
setlocal
cd /d "%~dp0.."
set FAIL=0
echo === Hall of Fame ===
node test\test_hof.js || set FAIL=1
echo.
echo === Module commands ===
node test\test_modules.js || set FAIL=1
echo.
echo === Circuit, freestyle, world tour, talks, UI render ===
node test\test_new_modules.js || set FAIL=1
echo.
echo === Travel, awards, sponsors, wellbeing, fun modes ===
node test\test_more_modules.js || set FAIL=1
echo.
echo === Mods, world top, prospects, Y, drama and orgs ===
node test\test_world_modules.js || set FAIL=1
echo.
echo === Live caster (observer, composer, live panel) ===
node test\test_live_caster.js || set FAIL=1
echo.
echo === Player editor (name, photo, PlayStyle) ===
node test\test_editor.js || set FAIL=1
echo.
echo === Staff, regional recruitment, match simulation, player creator ===
node test\test_staff_sim.js || set FAIL=1
for %%S in ("%APPDATA%\rl-career-hub\saves\*.json") do (
  echo.
  echo === Season simulation: %%~nxS ===
  node test\test_season_sim.js "%%~fS" 420 || set FAIL=1
)
echo.
if %FAIL%==0 (echo ALL TESTS PASSED) else (echo SOME TESTS FAILED)
exit /b %FAIL%
