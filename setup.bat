@echo off
setlocal enabledelayedexpansion

REM Brahma AI bootstrap (one file)
REM - First run: installs dependencies (manually, per-module), runs the app once, then marks setup as done.
REM - Next runs: verifies deps are present, then launches immediately.

set "ROOT=%~dp0"
cd /d "%ROOT%"

set "MARKER=%ROOT%.brahma_setup_done"

echo.
echo ===== Brahma AI Setup =====
echo Location: %ROOT%
echo.

REM --- Node check
where node >nul 2>&1
if errorlevel 1 (
  echo [error] Node.js not found. Install Node.js LTS and rerun setup.bat.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [error] npm not found. Reinstall Node.js LTS and rerun setup.bat.
  pause
  exit /b 1
)

REM --- Install Node deps only if missing
if exist "%ROOT%node_modules\\electron\\package.json" (
  echo [ok] Node dependencies already installed.
) else (
  echo [1/3] Installing Node dependencies (per-module)...
  echo This may take a few minutes.
  echo.

  REM Keep versions aligned with package.json; these commands will update package-lock.json automatically.
  call npm install electron@^37.2.0 --no-fund --no-audit
  if errorlevel 1 goto :npm_failed
  call npm install --save-dev electron-builder@^25.1.6 --no-fund --no-audit
  if errorlevel 1 goto :npm_failed
  call npm install firebase@^12.10.0 --no-fund --no-audit
  if errorlevel 1 goto :npm_failed
  call npm install active-win@^8.2.1 --no-fund --no-audit
  if errorlevel 1 goto :npm_failed
  call npm install node-fetch@2.6.12 --no-fund --no-audit
  if errorlevel 1 goto :npm_failed
  call npm install qrcode@^1.5.4 --no-fund --no-audit
  if errorlevel 1 goto :npm_failed

  echo [ok] Node dependencies installed.
)

REM --- Backend availability: prefer bundled exe (no Python required)
if exist "%ROOT%brahma-backend.exe" (
  echo [ok] Backend binary found (brahma-backend.exe).
) else (
  if exist "%ROOT%bk\\brahma-backend.exe" (
    echo [ok] Backend binary found (bk\\brahma-backend.exe).
  ) else (
    echo [2/3] Backend binary missing. Building backend...
    call npm run build:backend
    if errorlevel 1 (
      echo [error] Backend build failed.
      pause
      exit /b 1
    )
  )
)

REM --- First-run marker
if exist "%MARKER%" (
  echo [ok] Setup already completed. Launching Brahma AI...
  echo.
  call npm start
  exit /b 0
)

echo [3/3] First launch: Brahma AI will start now.
echo Close the app once it opens to finish setup.
echo.
call npm start

REM Create marker after the first successful run (app closed)
echo Setup completed on %DATE% %TIME%> "%MARKER%"
echo.
echo [ok] Setup completed. Next time, just run setup.bat to launch instantly.
pause
exit /b 0

:npm_failed
echo [error] npm install failed.
pause
exit /b 1

