@echo off
setlocal

set npm_config_progress=true
set npm_config_loglevel=notice

echo [1/2] Checking npm...
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm not found. Install Node.js first.
  exit /b 1
)

echo [2/2] Installing project dependencies (with progress)...
call npm.cmd install --progress=true --loglevel=notice
if errorlevel 1 (
  echo Failed to install dependencies.
  exit /b 1
)

echo Done.
exit /b 0
