@echo off
setlocal enabledelayedexpansion

REM Brahma AI full setup installer
REM This installs Node.js deps + Python deps needed for the backend.

cd /d "%~dp0"

echo.
echo [1/4] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Please install Node.js LTS and re-run install.bat.
  pause
  exit /b 1
)

echo [2/4] Installing Node.js dependencies...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

echo [3/4] Installing Python dependencies...
where python >nul 2>&1
if errorlevel 1 (
  echo Python not found. Please install Python 3.10+ and re-run install.bat.
  pause
  exit /b 1
)

call python -m pip install -r requirements.txt
if errorlevel 1 (
  echo pip install failed.
  pause
  exit /b 1
)

echo [4/4] Done.
echo You can now run start.bat to launch Brahma AI.
pause
exit /b 0
