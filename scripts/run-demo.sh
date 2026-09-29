#!/usr/bin/env bash
# Run LocalNet-style Daml Script demos for CBTC Collateral Desk.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.daml/bin:${PATH}"
cd "$ROOT"
daml build --no-legacy-assistant-warning
DAR=".daml/dist/cbtc-collateral-desk-0.1.0.dar"
# --static-time required for passTime / accrual demos on ide-ledger
echo "== Happy path (repay) =="
daml script --dar "$DAR" \
  --script-name Desk.Demo:runHappyPath \
  --ide-ledger --static-time \
  --no-legacy-assistant-warning
echo "== Liquidate path =="
daml script --dar "$DAR" \
  --script-name Desk.Demo:runLiquidatePath \
  --ide-ledger --static-time \
  --no-legacy-assistant-warning
echo "Demo scripts finished."
