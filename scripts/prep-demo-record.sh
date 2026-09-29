#!/usr/bin/env bash
# Prep automation for demo recording (does NOT capture video — you hit Record).
#
# Default: health-check (SKIP_* respected) → build → ide-ledger happy+liquidate → shot-list reminder.
#
# Env:
#   MODE=ide|ledger          default ide (ledger needs Path A sandbox)
#   START_SANDBOX=1          if MODE=ledger and sandbox down, start Path A BACKGROUND=1
#   WITH_UI=1                end by launching Vite (blocks)
#   SKIP_HEALTH=1            skip ./scripts/health-check.sh
#   SKIP_DAML_TEST / SKIP_NPM / SKIP_UI / SKIP_LOCALNET — forwarded to health-check
#   RUN_DEMO=1               default 1 — run happy+liquidate after prep
#
# See scripts/demo-record.md for shot list + checklist.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.daml/bin:${HOME}/.dpm/bin:${PATH}"
# Prefer JDK 21 for Canton sandbox if needed
if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -d /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ]]; then
    export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
  fi
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi
cd "$ROOT"

MODE="${MODE:-ide}"
RUN_DEMO="${RUN_DEMO:-1}"

echo "== prep-demo-record (MODE=$MODE) =="
echo "Recording guide: scripts/demo-record.md"
echo

if [[ "${SKIP_HEALTH:-0}" != "1" ]]; then
  echo "-- health-check --"
  # Default faster for recording prep unless user wants full
  SKIP_DAML_TEST="${SKIP_DAML_TEST:-0}" \
  SKIP_NPM="${SKIP_NPM:-0}" \
  SKIP_UI="${SKIP_UI:-0}" \
  SKIP_LOCALNET="${SKIP_LOCALNET:-0}" \
    ./scripts/health-check.sh
else
  echo "-- SKIP_HEALTH=1 — ensuring daml build only --"
  daml build --no-legacy-assistant-warning
fi

if [[ "$MODE" == "ledger" || "$MODE" == "localnet" || "$MODE" == "sandbox" ]]; then
  LEDGER_PORT=6865
  if [[ -f "$ROOT/localnet/configs/ports.env" ]]; then
    # shellcheck disable=SC1091
    source "$ROOT/localnet/configs/ports.env"
  fi
  listening() { lsof -n -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
  if ! listening "$LEDGER_PORT"; then
    if [[ "${START_SANDBOX:-0}" == "1" ]]; then
      echo "-- START_SANDBOX=1 — starting Path A BACKGROUND=1 --"
      BACKGROUND=1 ./localnet/scripts/start-sandbox.sh
    else
      echo "ERROR: Ledger API :$LEDGER_PORT not listening." >&2
      echo "  Start Path A in another terminal: ./localnet/scripts/start-sandbox.sh" >&2
      echo "  Or: START_SANDBOX=1 MODE=ledger $0" >&2
      exit 1
    fi
  else
    echo "OK  Path A Ledger API :$LEDGER_PORT LISTEN"
  fi
fi

echo
echo "============================================================"
echo " CHECKLIST before you hit Record"
echo "============================================================"
echo " [ ] JDK 21 on PATH for sandbox (JAVA_HOME=...openjdk@21...)"
echo " [ ] daml test green (or SKIP_DAML_TEST=1 if already known green)"
echo " [ ] Terminal font large enough; hide secrets / .env"
echo " [ ] Narration: bilateral desk — not a money-market pool"
echo " [ ] Do NOT claim live Grofty MainNet / live DecMan Gold / invent pins"
echo " [ ] Path B optional aside only (multi-node bring-up) — Desk.Demo stays Path A / ide"
echo " [ ] Path C only if cn-quickstart already running (heavy)"
echo " Shot list: scripts/demo-record.md"
echo "============================================================"
echo

if [[ "$RUN_DEMO" == "1" ]]; then
  echo "-- running demos (MODE=$MODE) — good dry-run before record --"
  WITH_UI="${WITH_UI:-0}" MODE="$MODE" ./scripts/run-full-demo.sh
else
  echo "RUN_DEMO=0 — skipped demos. When ready:"
  echo "  MODE=$MODE ./scripts/run-full-demo.sh"
  if [[ "${WITH_UI:-0}" == "1" ]]; then
    echo "  (WITH_UI=1) cd ui && npm run dev"
  fi
fi

echo
echo "PREP_DEMO_RECORD_DONE — start your screen recorder, then re-run:"
echo "  MODE=$MODE ./scripts/run-full-demo.sh"
echo "  # or WITH_UI=1 MODE=$MODE ./scripts/run-full-demo.sh"
