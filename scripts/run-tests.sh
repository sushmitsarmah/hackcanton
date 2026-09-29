#!/usr/bin/env bash
# Run Daml Script tests for CBTC Collateral Desk (SDK 3.4.9).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.daml/bin:${PATH}"
cd "$ROOT"
daml build --no-legacy-assistant-warning
echo "== daml test (all Script tests in package) =="
daml test --no-legacy-assistant-warning
echo "All tests finished."
