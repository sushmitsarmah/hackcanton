#!/usr/bin/env bash
# Upload Desk DAR to running Ledger API (idempotent if already loaded via --dar).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
if [[ ! -f "$DAR" ]]; then
  (cd "$ROOT" && daml build --no-legacy-assistant-warning)
fi
echo "== upload-dar $DAR -> ${LEDGER_HOST}:${LEDGER_PORT} =="
daml ledger upload-dar \
  --host "$LEDGER_HOST" \
  --port "$LEDGER_PORT" \
  --no-legacy-assistant-warning \
  "$DAR"
echo "Upload done."
