#!/usr/bin/env bash
# Reproducible BitSafe Contribution-pool LocalNet demo (Path A primary).
# Prints CONTRIB_DEMO_PASS / CONTRIB_DEMO_FAIL.
#
# Default flow:
#   1) ./scripts/health-check.sh
#   2) Ensure Path A sandbox (start if needed unless SKIP_SANDBOX_START=1)
#   3) MODE=ledger ./scripts/run-full-demo.sh (RESET_BETWEEN=1)
#   4) Optional: WITH_PATH_B=1 → ./localnet/scripts/proof-multi.sh
#
# Env:
#   SKIP_HEALTH=1           skip health-check
#   SKIP_SANDBOX_START=1    do not auto-start sandbox (fail if :6865 down)
#   SKIP_LEDGER_DEMO=1      health (+ optional Path B) only
#   IDE_FALLBACK=1          if sandbox unavailable, run ide-ledger full demo (weaker)
#   WITH_PATH_B=1           also run Path B proof-multi (multi must already be up,
#                           or set START_PATH_B=1 to BACKGROUND start-multi)
#   START_PATH_B=1          BACKGROUND=1 start-multi before proof (heavy)
#   HEALTH_* / SKIP_*       forwarded to health-check.sh (e.g. SKIP_NPM=1)
#
# Honesty: this is Contribution / LocalNet evidence — not BitSafe Gold DecMan.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.daml/bin:${HOME}/.dpm/bin:${PATH}"
# Prefer JDK 21 for Canton sandbox on Mac Homebrew layouts.
if [[ -z "${JAVA_HOME:-}" && -d /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ]]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
  export PATH="$JAVA_HOME/bin:$PATH"
fi
cd "$ROOT"

PASS=0
FAIL=0
WARN=0
ok()   { PASS=$((PASS + 1)); echo "  OK  $*"; }
warn() { WARN=$((WARN + 1)); echo "  WARN $*"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL $*"; }

listening() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -n -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v nc >/dev/null 2>&1; then
    nc -z localhost "$p" >/dev/null 2>&1
  else
    return 1
  fi
}

LEDGER_PORT=6865
if [[ -f "$ROOT/localnet/configs/ports.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/localnet/configs/ports.env"
fi

echo "== BitSafe Contribution demo (LocalNet Path A) =="
echo "Docs: BITSAFE_CONTRIBUTION.md · LOCALNET.md · integrations/bitsafe/"
echo "Claim: Contribution pool only if NOT submitting Gold (mutually exclusive)."
echo

# --- 1. Health ---
if [[ "${SKIP_HEALTH:-0}" == "1" ]]; then
  warn "SKIP_HEALTH=1 — skipped health-check"
else
  echo "-- health-check --"
  if "$ROOT/scripts/health-check.sh"; then
    ok "health-check"
  else
    fail "health-check"
  fi
fi

# --- 2. Path A sandbox ---
SANDBOX_OK=0
if [[ "${SKIP_LEDGER_DEMO:-0}" == "1" ]]; then
  warn "SKIP_LEDGER_DEMO=1 — skipping Ledger demo"
else
  if listening "$LEDGER_PORT"; then
    ok "sandbox Ledger :${LEDGER_PORT} already listening"
    SANDBOX_OK=1
  elif [[ "${SKIP_SANDBOX_START:-0}" == "1" ]]; then
    fail "Ledger :${LEDGER_PORT} down and SKIP_SANDBOX_START=1"
  else
    echo "-- starting Path A sandbox (BACKGROUND=1) --"
    if BACKGROUND=1 "$ROOT/localnet/scripts/start-sandbox.sh"; then
      # Wait briefly for listen
      for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
        if listening "$LEDGER_PORT"; then
          SANDBOX_OK=1
          break
        fi
        sleep 1
      done
      if [[ "$SANDBOX_OK" -eq 1 ]]; then
        ok "sandbox started on :${LEDGER_PORT}"
      else
        fail "sandbox start did not open :${LEDGER_PORT} in time"
      fi
    else
      fail "start-sandbox.sh failed"
    fi
  fi

  # --- 3. Full demo on Ledger API ---
  if [[ "$SANDBOX_OK" -eq 1 ]]; then
    echo "-- MODE=ledger run-full-demo (RESET_BETWEEN=1) --"
    if MODE=ledger RESET_BETWEEN=1 "$ROOT/scripts/run-full-demo.sh"; then
      ok "Path A Ledger happy + liquidate"
    else
      fail "Path A Ledger demo"
    fi
  elif [[ "${IDE_FALLBACK:-0}" == "1" ]]; then
    warn "sandbox unavailable — IDE_FALLBACK=1 running ide-ledger (weaker Contribution evidence)"
    if "$ROOT/scripts/run-full-demo.sh"; then
      ok "ide-ledger happy + liquidate (fallback)"
    else
      fail "ide-ledger demo"
    fi
  else
    fail "no Ledger demo (start sandbox or set IDE_FALLBACK=1)"
  fi
fi

# --- 4. Optional Path B ---
if [[ "${WITH_PATH_B:-0}" == "1" ]]; then
  echo "-- Path B proof-multi (optional) --"
  if [[ "${START_PATH_B:-0}" == "1" ]]; then
    BACKGROUND=1 "$ROOT/localnet/scripts/start-multi.sh" || fail "start-multi"
    sleep 3
  fi
  if [[ -x "$ROOT/localnet/scripts/proof-multi.sh" ]]; then
    if "$ROOT/localnet/scripts/proof-multi.sh"; then
      ok "Path B proof-multi"
    else
      fail "Path B proof-multi (start with BACKGROUND=1 ./localnet/scripts/start-multi.sh)"
    fi
  else
    fail "missing localnet/scripts/proof-multi.sh"
  fi
fi

echo
echo "== Contribution demo summary: pass=$PASS warn=$WARN fail=$FAIL =="
if [[ "$FAIL" -gt 0 ]]; then
  echo "CONTRIB_DEMO_FAIL"
  exit 1
fi
echo "CONTRIB_DEMO_PASS"
echo "Remember: claim Contribution on AppsFactory only if not submitting Gold."
exit 0
