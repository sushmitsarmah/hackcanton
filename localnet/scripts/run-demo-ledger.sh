#!/usr/bin/env bash
# Run Desk.Demo scripts against real Ledger API (NOT --ide-ledger).
# Note: Canton sandbox allocateParty can collide if two scripts both allocate
# the same display names on one ledger. Default: run each script; set
# RESET_BETWEEN=1 to stop/start sandbox between scripts.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
if [[ ! -f "$DAR" ]]; then
  (cd "$ROOT" && daml build --no-legacy-assistant-warning)
fi
TIME_FLAG=(--static-time)
if [[ "${STATIC_TIME:-1}" != "1" ]]; then
  TIME_FLAG=(--wall-clock-time)
fi
SCRIPTS=(Desk.Demo:runHappyPath Desk.Demo:runLiquidatePath)
if [[ $# -gt 0 ]]; then
  SCRIPTS=("$@")
fi
first=1
for s in "${SCRIPTS[@]}"; do
  if [[ "${RESET_BETWEEN:-0}" == "1" && "$first" -eq 0 ]]; then
    echo "== resetting sandbox between demos =="
    "$SCRIPT_DIR/stop-sandbox.sh"
    "$SCRIPT_DIR/start-sandbox.sh"
  fi
  first=0
  echo "== daml script $s @ ${LEDGER_HOST}:${LEDGER_PORT} =="
  daml script \
    --dar "$DAR" \
    --script-name "$s" \
    --ledger-host "$LEDGER_HOST" \
    --ledger-port "$LEDGER_PORT" \
    "${TIME_FLAG[@]}" \
    --upload-dar true \
    --no-legacy-assistant-warning
done
echo "Ledger API demos finished."
