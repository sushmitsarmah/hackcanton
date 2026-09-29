#!/usr/bin/env bash
# Upload Desk DAR to BOTH Path B participants (required for cross-participant visibility of templates).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
# shellcheck disable=SC1091
source "$LOCALNET_DIR/configs/path-b.env"

if [[ ! -f "$DAR" ]]; then
  (cd "$ROOT" && daml build --no-legacy-assistant-warning)
fi

upload_one() {
  local host="$1" port="$2" label="$3"
  echo "== upload-dar $DAR -> $label ${host}:${port} =="
  daml ledger upload-dar \
    --host "$host" \
    --port "$port" \
    --no-legacy-assistant-warning \
    "$DAR"
}

upload_one "$P1_LEDGER_HOST" "$P1_LEDGER_PORT" "participant1"
upload_one "$P2_LEDGER_HOST" "$P2_LEDGER_PORT" "participant2"
echo "Upload done on both participants."
