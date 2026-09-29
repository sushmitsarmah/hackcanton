#!/usr/bin/env bash
# Small Path B proof: both Ledger APIs listening + parties visible on each node.
# Does NOT run Desk.Demo (scripts allocate all parties on one participant).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
# shellcheck disable=SC1091
source "$LOCALNET_DIR/configs/path-b.env"

fail=0
listening() {
  local p="$1"
  lsof -n -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1
}

echo "== Path B proof =="
if listening "$P1_LEDGER_PORT"; then
  echo "OK  p1 Ledger :$P1_LEDGER_PORT LISTEN"
else
  echo "FAIL p1 Ledger :$P1_LEDGER_PORT not listening"; fail=1
fi
if listening "$P2_LEDGER_PORT"; then
  echo "OK  p2 Ledger :$P2_LEDGER_PORT LISTEN"
else
  echo "FAIL p2 Ledger :$P2_LEDGER_PORT not listening"; fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "Start Path B first: BACKGROUND=1 ./localnet/scripts/start-multi.sh" >&2
  exit 1
fi

echo "== list-parties participant1 :$P1_LEDGER_PORT =="
daml ledger list-parties \
  --host "$P1_LEDGER_HOST" --port "$P1_LEDGER_PORT" \
  --no-legacy-assistant-warning || fail=1

echo "== list-parties participant2 :$P2_LEDGER_PORT =="
daml ledger list-parties \
  --host "$P2_LEDGER_HOST" --port "$P2_LEDGER_PORT" \
  --no-legacy-assistant-warning || fail=1

if [[ "$fail" -eq 0 ]]; then
  echo "PATH_B_PROOF_OK"
  exit 0
fi
echo "PATH_B_PROOF_FAILED" >&2
exit 1
