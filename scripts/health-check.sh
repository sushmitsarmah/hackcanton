#!/usr/bin/env bash
# Observability / pre-submit health check for CBTC Collateral Desk (SDK 3.4.9).
# Default: daml build + daml test + optional LocalNet ping + grofty/bitsafe (and ui) npm builds.
#
# Env knobs:
#   SKIP_DAML_TEST=1     skip `daml test` (faster; still builds)
#   SKIP_NPM=1           skip Node package builds
#   SKIP_UI=1            skip ui npm build (grofty/bitsafe still run unless SKIP_NPM)
#   SKIP_LOCALNET=1      skip sandbox / port ping
#   REQUIRE_LOCALNET=1   fail if sandbox is not listening (default: warn only)
#
# Exit: 0 if required checks pass; non-zero on hard failures.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.daml/bin:${HOME}/.dpm/bin:${PATH}"
cd "$ROOT"

PASS=0
WARN=0
FAIL=0
ok()   { PASS=$((PASS + 1)); echo "  OK  $*"; }
warn() { WARN=$((WARN + 1)); echo "  WARN $*"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL $*"; }

section() { echo; echo "== $* =="; }

section "Environment"
if command -v daml >/dev/null 2>&1; then
  ok "daml on PATH ($(command -v daml))"
else
  fail "daml not on PATH (export PATH=\"\$HOME/.daml/bin:\$PATH\")"
fi
if command -v java >/dev/null 2>&1; then
  ok "java: $(java -version 2>&1 | head -1)"
else
  warn "java not on PATH (needed for Canton sandbox Path A)"
fi
if command -v node >/dev/null 2>&1; then
  ok "node $(node -v)"
else
  warn "node not on PATH (npm package builds will skip/fail)"
fi
if command -v npm >/dev/null 2>&1; then
  ok "npm $(npm -v)"
else
  warn "npm not on PATH"
fi

section "Daml build"
if daml build --no-legacy-assistant-warning; then
  DAR=".daml/dist/cbtc-collateral-desk-0.1.0.dar"
  if [[ -f "$DAR" ]]; then
    ok "DAR present: $DAR ($(du -h "$DAR" | awk '{print $1}'))"
  else
    fail "build succeeded but DAR missing at $DAR"
  fi
else
  fail "daml build failed"
fi

section "Daml test"
if [[ "${SKIP_DAML_TEST:-0}" == "1" ]]; then
  warn "SKIP_DAML_TEST=1 — skipped daml test"
elif daml test --no-legacy-assistant-warning; then
  ok "daml test green"
else
  fail "daml test failed"
fi

section "LocalNet sandbox ping (optional)"
if [[ "${SKIP_LOCALNET:-0}" == "1" ]]; then
  warn "SKIP_LOCALNET=1 — skipped"
else
  # Prefer repo status script when present; also probe ports from ports.env.
  LEDGER_PORT=6865
  JSON_API_PORT=7575
  if [[ -f "$ROOT/localnet/configs/ports.env" ]]; then
    # shellcheck disable=SC1091
    source "$ROOT/localnet/configs/ports.env"
  fi
  if [[ -x "$ROOT/localnet/scripts/status.sh" ]]; then
    "$ROOT/localnet/scripts/status.sh" || true
  fi
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
  if listening "$LEDGER_PORT"; then
    ok "Ledger API :${LEDGER_PORT} LISTEN"
  else
    msg="Ledger API :${LEDGER_PORT} not listening (Path A optional — see LOCALNET.md)"
    if [[ "${REQUIRE_LOCALNET:-0}" == "1" ]]; then
      fail "$msg"
    else
      warn "$msg"
    fi
  fi
  if listening "$JSON_API_PORT"; then
    ok "JSON API :${JSON_API_PORT} LISTEN"
  else
    warn "JSON API :${JSON_API_PORT} not listening"
  fi
fi

run_npm_build() {
  local dir="$1"
  local label="$2"
  if [[ ! -f "$ROOT/$dir/package.json" ]]; then
    warn "$label: no package.json"
    return 0
  fi
  if [[ ! -d "$ROOT/$dir/node_modules" ]]; then
    echo "  … npm install in $dir"
    (cd "$ROOT/$dir" && npm install --silent) || { fail "$label npm install"; return 0; }
  fi
  if (cd "$ROOT/$dir" && npm run build); then
    ok "$label npm run build"
  else
    fail "$label npm run build"
  fi
}

section "Integration / UI npm builds"
if [[ "${SKIP_NPM:-0}" == "1" ]]; then
  warn "SKIP_NPM=1 — skipped grofty/bitsafe/ui builds"
else
  if ! command -v npm >/dev/null 2>&1; then
    fail "npm missing — cannot build packages"
  else
    run_npm_build "integrations/grofty" "grofty"
    run_npm_build "integrations/bitsafe" "bitsafe"
    if [[ "${SKIP_UI:-0}" == "1" ]]; then
      warn "SKIP_UI=1 — skipped ui build"
    else
      run_npm_build "ui" "ui"
    fi
  fi
fi

section "Summary"
echo "  pass=$PASS  warn=$WARN  fail=$FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  echo "HEALTH CHECK FAILED"
  exit 1
fi
echo "HEALTH CHECK OK"
exit 0
