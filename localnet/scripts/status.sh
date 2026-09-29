#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
echo "== Path A (sandbox) =="
echo "JAVA_HOME=${JAVA_HOME:-unset}"
java -version 2>&1 | head -1 || true
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "sandbox pid=$(cat "$PID_FILE") RUNNING"
else
  echo "sandbox NOT running (no live pid file)"
fi
for p in "$LEDGER_PORT" "$ADMIN_API_PORT" "$JSON_API_PORT"; do
  if lsof -n -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "port $p LISTEN"
  else
    echo "port $p free"
  fi
done
if [[ -f "$LOG_FILE" ]]; then
  echo "--- last 15 Path A log lines ---"
  tail -15 "$LOG_FILE"
fi
echo
if [[ -x "$SCRIPT_DIR/status-multi.sh" ]]; then
  "$SCRIPT_DIR/status-multi.sh"
fi
