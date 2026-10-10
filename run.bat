@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js and run again.
  pause
  exit /b 1
)

if not exist "outputs\brig.html" (
  echo Building game files...
  node "work\build.cjs"
  if errorlevel 1 (
    echo [ERROR] Game build failed.
    pause
    exit /b 1
  )
)

echo Starting Black Tern sailing game...
start "Black Tern Server" /D "%~dp0" cmd /k node "work\serve-outputs.cjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8000/brig.html"
exit /b 0
