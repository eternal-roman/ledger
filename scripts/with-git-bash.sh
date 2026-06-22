#!/usr/bin/env bash
# scripts/with-git-bash.sh
# Helper to run a command using Git Bash on Windows or the current bash.
# Reduces friction when the host shell is pwsh.
#
# Usage:
#   ./scripts/with-git-bash.sh "npm test"
#   ./scripts/with-git-bash.sh "git status"
#   ./scripts/with-git-bash.sh "./hooks/ledger-activate"

set -euo pipefail

CMD="$*"

if [ -z "$CMD" ]; then
  echo "Usage: $0 <command>"
  exit 1
fi

# Try to find Git Bash on Windows (Git Bash can handle both styles)
GIT_BASH_PATHS=(
  "/c/Program Files/Git/bin/bash.exe"
  "/c/Program Files (x86)/Git/bin/bash.exe"
  "C:\\Program Files\\Git\\bin\\bash.exe"
  "C:\\Program Files (x86)\\Git\\bin\\bash.exe"
)

for p in "${GIT_BASH_PATHS[@]}"; do
  if [ -x "$p" ] 2>/dev/null || command -v "$p" >/dev/null 2>&1; then
    exec "$p" -c "$CMD"
  fi
done

if command -v bash >/dev/null 2>&1; then
  exec bash -c "$CMD"
else
  echo "Git Bash or bash not found. Install Git for Windows."
  exit 1
fi
