#!/usr/bin/env bash
# Path C helper: shallow-clone digital-asset/cn-quickstart (if missing) and print
# make install / make start steps. Does NOT pull multi-GB images or run `make start`
# unless already present and CN_QUICKSTART_START=1 is set.
#
# Clone location (default): localnet/cn-quickstart (gitignored)
# Override: CN_QUICKSTART_DIR=/path/to/cn-quickstart
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"

CN_DIR="${CN_QUICKSTART_DIR:-$LOCALNET_DIR/cn-quickstart}"
CN_REPO="${CN_QUICKSTART_REPO:-https://github.com/digital-asset/cn-quickstart.git}"
STARTED=0

echo "== Path C setup (cn-quickstart helper) =="
echo "  target dir : $CN_DIR"
echo "  repo       : $CN_REPO"
echo

# Detect existing clone nearby (do not touch sibling canton_hack)
if [[ ! -d "$CN_DIR/.git" ]]; then
  alt="$ROOT/../cn-quickstart"
  if [[ -d "$alt/.git" ]]; then
    echo "NOTE: found existing clone at $alt — set CN_QUICKSTART_DIR=$alt to reuse."
  fi
  echo "== shallow clone =="
  mkdir -p "$(dirname "$CN_DIR")"
  git clone --depth 1 "$CN_REPO" "$CN_DIR"
else
  echo "OK  clone already present at $CN_DIR"
fi

echo
echo "== docs / next steps (YOU run these; heavy Docker images) =="
echo "  cd \"$CN_DIR\""
echo "  # Often the app lives under quickstart/ — check README:"
echo "  ls"
echo "  make install    # or: cd quickstart && make install"
echo "  make start      # pulls multi-GB images; do NOT run from agents unless intentional"
echo
echo "== typical ports (verify in cn-quickstart README / LOCALNET docs) =="
echo "  JSON Ledger API : http://json-ledger-api.localhost  (or :7575 depending on build)"
echo "  App provider / user validator UIs — see cn-quickstart docs"
echo "  Docs:"
echo "    https://docs.canton.network/sdks-tools/reference-projects/cn-quickstart"
echo "    https://docs.sync.global/app_dev/testing/localnet.html"
echo
echo "== point Desk DAR / demos at Path C Ledger API =="
echo "  # After LocalNet is up and a validator exposes Ledger API:"
echo "  daml ledger upload-dar --host <HOST> --port <PORT> \\"
echo "    --no-legacy-assistant-warning \\"
echo "    $ROOT/.daml/dist/cbtc-collateral-desk-0.1.0.dar"
echo "  daml ledger allocate-parties --host <HOST> --port <PORT> \\"
echo "    --no-legacy-assistant-warning \\"
echo "    Desk CreditOfficer Lender Borrower Liquidator MockIssuer GroftyAuth"
echo "  daml script --dar $ROOT/.daml/dist/cbtc-collateral-desk-0.1.0.dar \\"
echo "    --script-name Desk.Demo:runHappyPath \\"
echo "    --ledger-host <HOST> --ledger-port <PORT> \\"
echo "    --static-time --upload-dar true --no-legacy-assistant-warning"
echo

# Light presence check — do not pull images
if command -v docker >/dev/null 2>&1; then
  if docker images 2>/dev/null | grep -qiE 'cn-quickstart|splice|canton-network|digitalasset'; then
    echo "NOTE: some CN/Splice-related docker images appear present locally."
  else
    echo "NOTE: no obvious cn-quickstart/Splice images detected locally (stack NOT started)."
  fi
else
  echo "NOTE: docker not on PATH — cannot check images."
fi

if [[ "${CN_QUICKSTART_START:-0}" == "1" ]]; then
  echo
  echo "== CN_QUICKSTART_START=1 — attempting make start (may pull multi-GB) =="
  if [[ -f "$CN_DIR/Makefile" ]]; then
    (cd "$CN_DIR" && make start) && STARTED=1
  elif [[ -f "$CN_DIR/quickstart/Makefile" ]]; then
    (cd "$CN_DIR/quickstart" && make start) && STARTED=1
  else
    echo "ERROR: no Makefile found under $CN_DIR" >&2
    exit 1
  fi
else
  echo
  echo "Stack NOT started (default). To start yourself after install:"
  echo "  CN_QUICKSTART_START=1 $0   # optional; pulls images"
  echo "  OR manually: cd \"$CN_DIR\" && make install && make start"
fi

echo
if [[ "$STARTED" -eq 1 ]]; then
  echo "PATH_C_STATUS=started"
else
  echo "PATH_C_STATUS=helper-ready (clone/docs only; stack not started)"
fi
