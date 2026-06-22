@echo off
REM scripts/with-git-bash.cmd
REM Windows convenience wrapper to run commands via Git Bash.
REM Usage: scripts\with-git-bash.cmd "npm test"   or   scripts\with-git-bash.cmd ./hooks/ledger-activate

setlocal

if "%~1"=="" (
  echo Usage: %0 "command to run in bash"
  exit /b 1
)

set "SCRIPT_DIR=%~dp0"

REM Prefer the sh version if bash can run it
if exist "%SCRIPT_DIR%with-git-bash.sh" (
    if exist "C:\Program Files\Git\bin\bash.exe" (
        "C:\Program Files\Git\bin\bash.exe" "%SCRIPT_DIR%with-git-bash.sh" %*
        exit /b %ERRORLEVEL%
    )
    if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
        "C:\Program Files (x86)\Git\bin\bash.exe" "%SCRIPT_DIR%with-git-bash.sh" %*
        exit /b %ERRORLEVEL%
    )
)

REM Fallback: run the command directly if bash on PATH
where bash >nul 2>nul
if %ERRORLEVEL% equ 0 (
    bash -c "%*"
    exit /b %ERRORLEVEL%
)

echo Git Bash not found. Please install Git for Windows.
exit /b 1
