#!/usr/bin/env bash
# Full demo runner for recording / submit dry-run (<5 min core path).
# Default: ide-ledger happy + liquidate (no Canton sandbox required).
#
# Modes:
#   ./scripts/run-full-demo.sh              # ide-ledger (default)
#   MODE=ledger ./scripts/run-full-demo.sh  # Ledger API :6865 (sandbox must be up)
#   WITH_UI=1 ./scripts/run-full-demo.sh    # also remind / optionally start UI
#
# Narration steps: see scripts/demo-record.md
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.daml/bin:${HOME}/.dpm/bin:${PATH}"
cd "$ROOT"

MODE="${MODE:-ide}"
echo "== CBTC Collateral Desk — full demo (MODE=$MODE) =="
echo "Narration guide: scripts/demo-record.md"
echo

case "$MODE" in
  ide|ide-ledger)
    echo "-- Phase 1: build + ide-ledger happy + liquidate --"
    "$ROOT/scripts/run-demo.sh"
    ;;
  ledger|localnet|sandbox)
    echo "-- Phase 1: Ledger API demos (sandbox must be listening) --"
    if [[ ! -x "$ROOT/localnet/scripts/run-demo-ledger.sh" ]]; then
      echo "Missing localnet/scripts/run-demo-ledger.sh" >&2
      exit 1
    fi
    # Party-name collisions between happy + liquidate: reset between runs by default.
    RESET_BETWEEN="${RESET_BETWEEN:-1}" "$ROOT/localnet/scripts/run-demo-ledger.sh"
    ;;
  *)
    echo "Unknown MODE=$MODE (use ide|ledger)" >&2
    exit 2
    ;;
esac

echo
echo "-- Phase 2: optional operator console --"
if [[ "${WITH_UI:-0}" == "1" ]]; then
  if [[ ! -d "$ROOT/ui/node_modules" ]]; then
    (cd "$ROOT/integrations/grofty" && npm install --silent && npm run build)
    (cd "$ROOT/ui" && npm install --silent)
  fi
  echo "Starting Vite UI (Ctrl+C to stop). Record propose→accept→lock→disburse→repay/liquidate."
  (cd "$ROOT/ui" && npm run dev)
else
  echo "Skipped UI (set WITH_UI=1 to launch). Manual:"
  echo "  cd ui && npm install && npm run dev"
fi

echo
echo "Full demo finished (MODE=$MODE)."
