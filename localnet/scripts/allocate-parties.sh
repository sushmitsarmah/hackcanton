#!/usr/bin/env bash
# Allocate Desk / CreditOfficer / Lender / Borrower / Liquidator (+ demo companions).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
PARTIES_FILE="$LOCALNET_DIR/configs/parties.txt"
PARTIES=()
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  PARTIES+=("$line")
done < "$PARTIES_FILE"
if [[ ${#PARTIES[@]} -eq 0 ]]; then
  PARTIES=(Desk CreditOfficer Lender Borrower Liquidator MockIssuer GroftyAuth)
fi
echo "== allocate-parties on ${LEDGER_HOST}:${LEDGER_PORT} =="
echo "  ${PARTIES[*]}"
daml ledger allocate-parties \
  --host "$LEDGER_HOST" \
  --port "$LEDGER_PORT" \
  --no-legacy-assistant-warning \
  "${PARTIES[@]}"
echo "== list-parties =="
daml ledger list-parties \
  --host "$LEDGER_HOST" \
  --port "$LEDGER_PORT" \
  --no-legacy-assistant-warning
