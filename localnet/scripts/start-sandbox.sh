#!/usr/bin/env bash
# Path A: start Canton sandbox (real Ledger API) with SDK 3.4.9 canton.jar.
# Prefer FOREGROUND=1 (default) in an interactive terminal. Set BACKGROUND=1 for nohup.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"

if [[ ! -f "$CANTON_JAR" ]]; then
  echo "ERROR: Canton jar not found at $CANTON_JAR (install Daml SDK 3.4.9)." >&2
  exit 1
fi

if [[ ! -f "$DAR" ]]; then
  echo "== building DAR =="
  (cd "$ROOT" && daml build --no-legacy-assistant-warning)
fi

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Sandbox already running (pid=$(cat "$PID_FILE"))."
  exit 0
fi

for p in "$LEDGER_PORT" "$ADMIN_API_PORT" "$JSON_API_PORT"; do
  if lsof -n -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "ERROR: port $p already in use. Stop the other process or change ports.env." >&2
    exit 1
  fi
done

STATIC_FLAG=()
if [[ "${STATIC_TIME:-1}" == "1" ]]; then
  STATIC_FLAG=(--static-time)
fi

echo "== starting Canton sandbox =="
echo "  JAVA_HOME=${JAVA_HOME:-"(unset)"}"
echo "  Ledger API  : ${LEDGER_HOST}:${LEDGER_PORT}"
echo "  Admin API   : ${ADMIN_API_PORT}"
echo "  JSON API    : ${JSON_API_PORT}"
echo "  DAR         : $DAR"
echo "  log         : $LOG_FILE"

CMD=(java --add-opens=java.base/java.lang=ALL-UNNAMED
  -jar "$CANTON_JAR"
  sandbox
  --ledger-api-port "$LEDGER_PORT"
  --admin-api-port "$ADMIN_API_PORT"
  --json-api-port "$JSON_API_PORT"
  "${STATIC_FLAG[@]}"
  --dar "$DAR")

if [[ "${BACKGROUND:-0}" == "1" ]]; then
  : > "$LOG_FILE"
  nohup "${CMD[@]}" >> "$LOG_FILE" 2>&1 </dev/null &
  echo $! > "$PID_FILE"
  echo "pid=$(cat "$PID_FILE") (BACKGROUND=1)"
  echo "== waiting for ready =="
  for i in $(seq 1 90); do
    if grep -q "Canton sandbox is ready" "$LOG_FILE" 2>/dev/null; then
      echo "READY (Ledger API ${LEDGER_HOST}:${LEDGER_PORT})"
      exit 0
    fi
    if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "ERROR: sandbox process died. Tail of log:" >&2
      tail -50 "$LOG_FILE" >&2
      exit 1
    fi
    sleep 2
  done
  echo "ERROR: timed out waiting for sandbox. See $LOG_FILE" >&2
  exit 1
fi

# Foreground (default): keeps process alive reliably in a dedicated terminal.
echo $$ > "$PID_FILE"
echo "Running in FOREGROUND (Ctrl+C to stop). For nohup: BACKGROUND=1 $0"
exec "${CMD[@]}" 2>&1 | tee "$LOG_FILE"
