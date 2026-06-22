: << 'CMDBLOCK'
@echo off
REM Cross-platform polyglot wrapper for Ledger bash hooks.
REM Based on patterns from superpowers plugin (recommended component).
REM
REM On Windows: cmd.exe runs the batch portion, which locates bash (Git for Windows preferred)
REM             and executes the extensionless hook script.
REM On Unix: the shell sees ":" as no-op and runs the bash part at the bottom.
REM
REM Hook scripts have no extension (e.g. "ledger-activate") so that
REM Claude Code's Windows detection doesn't auto-prepend "bash".
REM
REM Usage: run-hook.cmd <script-name-without-ext> [args...]
REM
REM Recommended for Windows users: Install Git for Windows (provides bash).
REM Then run Claude Code from Git Bash when possible for full bash experience.

if "%~1"=="" (
    echo run-hook.cmd: missing hook script name >&2
    exit /b 1
)

set "HOOK_DIR=%~dp0"

REM Try common Git for Windows locations first (most reliable)
if exist "C:\Program Files\Git\bin\bash.exe" (
    "C:\Program Files\Git\bin\bash.exe" "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)
if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    "C:\Program Files (x86)\Git\bin\bash.exe" "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)

REM Fall back to any bash on PATH (Git Bash, MSYS2, WSL interop, etc.)
where bash >nul 2>nul
if %ERRORLEVEL% equ 0 (
    bash "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)

REM No bash found.
REM Emit a graceful message and continue (the plugin/skill still loads via AGENTS.md).
echo Ledger hooks: bash not found on PATH. Using fallback. Install Git for Windows for best experience. >&2
exit /b 0
CMDBLOCK

# Unix/bash portion (executed on macOS/Linux and when bash runs this file)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_NAME="$1"
shift || true
exec bash "${SCRIPT_DIR}/${SCRIPT_NAME}" "$@"
