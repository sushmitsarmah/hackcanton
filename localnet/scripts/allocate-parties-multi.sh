#!/usr/bin/env bash
# Allocate / list parties on each Path B participant via Ledger API.
# Note: bootstrap-multi.canton already enables the intended split via console.
# This helper is idempotent-ish proof via daml ledger allocate-parties / list-parties.
#
# Default split:
#   p1 (:5011): Desk CreditOfficer MockIssuer
#   p2 (:5021): Lender Borrower Liquidator GroftyAuth
#
# Set ALL_ON_P1=1 to allocate every party on participant1 only (single-host demo style).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
# shellcheck disable=SC1091
source "$LOCALNET_DIR/configs/path-b.env"

P1_PARTIES=(Desk CreditOfficer MockIssuer)
P2_PARTIES=(Lender Borrower Liquidator GroftyAuth)

if [[ "${ALL_ON_P1:-0}" == "1" ]]; then
  P1_PARTIES=(Desk CreditOfficer Lender Borrower Liquidator MockIssuer GroftyAuth)
  P2_PARTIES=()
fi

alloc_list() {
  local host="$1" port="$2" label="$3"
  shift 3
  local parties=("$@")
  if [[ ${#parties[@]} -eq 0 ]]; then
    echo "== $label ${host}:${port}: (no parties to allocate) =="
    return 0
  fi
  echo "== allocate on $label ${host}:${port}: ${parties[*]} =="
  # allocate-parties may error if display name already exists from bootstrap — continue to list.
  daml ledger allocate-parties \
    --host "$host" \
    --port "$port" \
    --no-legacy-assistant-warning \
    "${parties[@]}" || echo "(allocate may already exist from bootstrap — listing)"
  echo "== list-parties $label =="
  daml ledger list-parties \
    --host "$host" \
    --port "$port" \
    --no-legacy-assistant-warning
}

alloc_list "$P1_LEDGER_HOST" "$P1_LEDGER_PORT" "participant1" "${P1_PARTIES[@]}"
alloc_list "$P2_LEDGER_HOST" "$P2_LEDGER_PORT" "participant2" "${P2_PARTIES[@]}"
