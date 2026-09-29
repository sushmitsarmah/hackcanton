#!/usr/bin/env bash
# Path B status: pid + Ledger/Admin/JSON ports for both participants + sequencer/mediator.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
# shellcheck disable=SC1091
source "$LOCALNET_DIR/configs/path-b.env"

MULTI_PID_FILE="$LOCALNET_DIR/run/multi.pid"
MULTI_LOG_FILE="$LOCALNET_DIR/logs/multi-daemon.log"

echo "== Path B status =="
echo "JAVA_HOME=${JAVA_HOME:-unset}"
java -version 2>&1 | head -1 || true

if [[ -f "$MULTI_PID_FILE" ]] && kill -0 "$(cat "$MULTI_PID_FILE")" 2>/dev/null; then
  echo "multi pid=$(cat "$MULTI_PID_FILE") RUNNING"
else
  echo "multi NOT running (pid file missing or process dead)"
fi

check_port() {
  local label="$1" p="$2"
  if lsof -n -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "$label :$p LISTEN"
  else
    echo "$label :$p free"
  fi
}

check_port "p1 Ledger" "$P1_LEDGER_PORT"
check_port "p1 Admin " "$P1_ADMIN_API_PORT"
check_port "p1 JSON  " "$P1_JSON_API_PORT"
check_port "p2 Ledger" "$P2_LEDGER_PORT"
check_port "p2 Admin " "$P2_ADMIN_API_PORT"
check_port "p2 JSON  " "$P2_JSON_API_PORT"
check_port "sequencer public" "$SEQUENCER_PUBLIC_PORT"
check_port "sequencer admin " "$SEQUENCER_ADMIN_PORT"
check_port "mediator admin  " "$MEDIATOR_ADMIN_PORT"

if [[ -f "$MULTI_LOG_FILE" ]]; then
  echo "--- last 20 multi log lines ---"
  tail -20 "$MULTI_LOG_FILE"
fi
