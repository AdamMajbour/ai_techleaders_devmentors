#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

case "$(uname -s 2>/dev/null || printf unknown)" in
  MINGW*|MSYS*|CYGWIN*)
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_DIR/test-env-up.ps1"
    ;;
  *)
    echo "No POSIX test-env-up implementation is configured; use the repository's native test-env-up.ps1 on Windows." >&2
    exit 1
    ;;
esac
