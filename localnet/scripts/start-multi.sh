#!/usr/bin/env bash
# Path B: start 2 participants + synchronizer via Canton daemon + bootstrap.
# Prefer BACKGROUND=1 for scripting; FOREGROUND (default) for a dedicated terminal.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
# shellcheck disable=SC1091
source "$LOCALNET_DIR/configs/path-b.env"

MULTI_PID_FILE="$LOCALNET_DIR/run/multi.pid"
MULTI_LOG_FILE="$LOCALNET_DIR/logs/multi-daemon.log"
MULTI_CONF="$LOCALNET_DIR/configs/multi-participant.conf"
MULTI_BOOTSTRAP="$LOCALNET_DIR/configs/bootstrap-multi.canton"
MULTI_LOG_NAME="$LOCALNET_DIR/logs/canton-multi.log"

if [[ ! -f "$CANTON_JAR" ]]; then
  echo "ERROR: Canton jar not found at $CANTON_JAR (install Daml SDK 3.4.9)." >&2
  exit 1
fi
if [[ ! -f "$MULTI_CONF" || ! -f "$MULTI_BOOTSTRAP" ]]; then
  echo "ERROR: missing $MULTI_CONF or $MULTI_BOOTSTRAP" >&2
  exit 1
fi

if [[ -f "$MULTI_PID_FILE" ]] && kill -0 "$(cat "$MULTI_PID_FILE")" 2>/dev/null; then
  echo "Path B multi already running (pid=$(cat "$MULTI_PID_FILE"))."
  exit 0
fi

PORTS=(
  "$P1_LEDGER_PORT" "$P1_ADMIN_API_PORT" "$P1_JSON_API_PORT"
  "$P2_LEDGER_PORT" "$P2_ADMIN_API_PORT" "$P2_JSON_API_PORT"
  "$SEQUENCER_PUBLIC_PORT" "$SEQUENCER_ADMIN_PORT" "$MEDIATOR_ADMIN_PORT"
)
for p in "${PORTS[@]}"; do
  if lsof -n -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "ERROR: Path B port $p already in use. Stop the other process or change path-b.env." >&2
    exit 1
  fi
done

# Warn if Path A sandbox is up (no hard fail — different ports).
if lsof -n -iTCP:"${LEDGER_PORT:-6865}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "NOTE: Path A sandbox appears up on :${LEDGER_PORT:-6865} (ok — Path B uses different ports)."
fi

mkdir -p "$LOCALNET_DIR/run" "$LOCALNET_DIR/logs"
: > "$MULTI_LOG_FILE"

echo "== starting Path B multi-participant Canton =="
echo "  JAVA_HOME=${JAVA_HOME:-"(unset)"}"
echo "  conf      : $MULTI_CONF"
echo "  bootstrap : $MULTI_BOOTSTRAP"
echo "  p1 Ledger : ${P1_LEDGER_HOST}:${P1_LEDGER_PORT}"
echo "  p2 Ledger : ${P2_LEDGER_HOST}:${P2_LEDGER_PORT}"
echo "  log       : $MULTI_LOG_FILE"

# canton.jar writes its own log under --log-file-name; also tee stdout.
CMD=(java --add-opens=java.base/java.lang=ALL-UNNAMED
  -jar "$CANTON_JAR"
  daemon
  -c "$MULTI_CONF"
  --bootstrap "$MULTI_BOOTSTRAP"
  --log-file-name "$MULTI_LOG_NAME"
  --log-level-stdout INFO)

if [[ "${BACKGROUND:-0}" == "1" ]]; then
  nohup "${CMD[@]}" >> "$MULTI_LOG_FILE" 2>&1 </dev/null &
  echo $! > "$MULTI_PID_FILE"
  echo "pid=$(cat "$MULTI_PID_FILE") (BACKGROUND=1)"
  echo "== waiting for PATH_B_BOOTSTRAP_READY =="
  for i in $(seq 1 120); do
    if grep -q "PATH_B_BOOTSTRAP_READY" "$MULTI_LOG_FILE" 2>/dev/null; then
      echo "READY — p1 :${P1_LEDGER_PORT}  p2 :${P2_LEDGER_PORT}"
      exit 0
    fi
    if ! kill -0 "$(cat "$MULTI_PID_FILE")" 2>/dev/null; then
      echo "ERROR: multi process died. Tail of log:" >&2
      tail -80 "$MULTI_LOG_FILE" >&2
      exit 1
    fi
    sleep 2
  done
  echo "ERROR: timed out waiting for bootstrap. See $MULTI_LOG_FILE" >&2
  tail -80 "$MULTI_LOG_FILE" >&2
  exit 1
fi

echo $$ > "$MULTI_PID_FILE"
echo "Running in FOREGROUND (Ctrl+C to stop). For nohup: BACKGROUND=1 $0"
exec "${CMD[@]}" 2>&1 | tee "$MULTI_LOG_FILE"
