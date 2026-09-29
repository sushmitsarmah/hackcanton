#!/usr/bin/env bash
# Shared LocalNet env for CBTC Collateral Desk (SDK 3.4.9).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCALNET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Prefer JDK 21 — Canton/Daml SDK 3.4.x is unreliable on JDK 25+.
if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -d /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ]]; then
    export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
  elif [[ -d /usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ]]; then
    export JAVA_HOME=/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
  fi
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi
export PATH="${HOME}/.daml/bin:${HOME}/.dpm/bin:${PATH}"
# shellcheck disable=SC1091
source "$LOCALNET_DIR/configs/ports.env"
DAR="${DAR:-$ROOT/.daml/dist/cbtc-collateral-desk-0.1.0.dar}"
CANTON_JAR="${CANTON_JAR:-$HOME/.daml/sdk/3.4.9/canton/canton.jar}"
PID_FILE="$LOCALNET_DIR/run/sandbox.pid"
LOG_FILE="$LOCALNET_DIR/logs/canton-daemon.log"
PORT_FILE="$LOCALNET_DIR/run/portfile"
mkdir -p "$LOCALNET_DIR/run" "$LOCALNET_DIR/logs"
