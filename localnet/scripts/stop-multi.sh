#!/usr/bin/env bash
# Path B: stop multi-participant Canton daemon.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env.sh"
# shellcheck disable=SC1091
source "$LOCALNET_DIR/configs/path-b.env"

MULTI_PID_FILE="$LOCALNET_DIR/run/multi.pid"

if [[ -f "$MULTI_PID_FILE" ]]; then
  pid=$(cat "$MULTI_PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping Path B multi pid=$pid"
    kill "$pid" 2>/dev/null || true
    for i in $(seq 1 30); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$MULTI_PID_FILE"
fi

# Best-effort: only kill processes that look like our multi daemon (not Path A sandbox).
# Match config path fragment so we don't kill `canton.jar sandbox`.
pkill -f "canton.jar daemon .*multi-participant.conf" 2>/dev/null || true
pkill -f "canton.jar daemon -c .*multi-participant.conf" 2>/dev/null || true

# Also free Path B ports if a stale java still holds them.
for p in "$P1_LEDGER_PORT" "$P2_LEDGER_PORT" "$SEQUENCER_PUBLIC_PORT" "$MEDIATOR_ADMIN_PORT"; do
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -t -n -iTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)
    if [[ -n "${pids:-}" ]]; then
      echo "Killing leftover listeners on :$p -> $pids"
      # shellcheck disable=SC2086
      kill $pids 2>/dev/null || true
      sleep 1
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi
done

echo "Path B stopped."
