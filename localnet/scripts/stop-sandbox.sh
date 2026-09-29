#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
if [[ -f "$PID_FILE" ]]; then
  pid=$(cat "$PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping sandbox pid=$pid"
    kill "$pid" 2>/dev/null || true
    for i in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi
# Also kill any leftover canton sandbox on default ports
pkill -f "canton.jar sandbox" 2>/dev/null || true
echo "Stopped."
