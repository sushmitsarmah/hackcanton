# Canton LocalNet — CBTC Collateral Desk (SDK 3.4.9)

**Point 5 deliverable.** Exact commands to run a real Canton Ledger API locally on Mac (not only `--ide-ledger`).

## What actually runs vs documented-only

| Path | What it is | Status on this Mac (2026-09-29 IST) |
| --- | --- | --- |
| **A — Canton sandbox (recommended)** | Single participant + local synchronizer via SDK `canton.jar` / `daml sandbox`. Real gRPC Ledger API `:6865`, JSON API `:7575`. | **Verified on Mac:** DAR upload (`--dar` + `daml ledger upload-dar`), party allocation (Desk/CreditOfficer/Lender/Borrower/Liquidator/…), `Desk.Demo:runHappyPath` and `runLiquidatePath` each against Ledger API `:6865` (run liquidate on a fresh sandbox). |
| **B — Multi-participant Canton (OSS)** | 2 participants + sequencer + mediator via `canton.jar daemon` + bootstrap. Ledger `:5011` / `:5021`. | **Startable:** `BACKGROUND=1 ./localnet/scripts/start-multi.sh` — both Ledger APIs listen; parties hosted on p1/p2; DAR upload to both. Desk.Demo cross-participant **not** supported as-is. |
| **C — Official CN LocalNet (cn-quickstart)** | Full multi-validator Docker LocalNet (SV + app-provider + app-user, wallets, Splice). | **Helper-ready:** `./localnet/scripts/path-c-setup.sh` shallow-clones + prints steps. Stack **not** started by default (heavy images). |

**JDK:** Canton/Daml SDK 3.4.9 needs **JDK 21** (Homebrew `openjdk@21`). JDK 25 is present on the machine but is not reliable for this sandbox.

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$HOME/.daml/bin:$PATH"
java -version   # expect 21.x
```

---

## Path A — exact commands (verified)

From repo root `cbtc-collateral-desk`:

### 1. Build DAR

```bash
daml build --no-legacy-assistant-warning
# → .daml/dist/cbtc-collateral-desk-0.1.0.dar
```

### 2. Start Canton sandbox (foreground — keep this terminal open)

```bash
# Foreground (default — keep terminal open):
./localnet/scripts/start-sandbox.sh
# Background nohup (may be reaped in some agent shells):
BACKGROUND=1 ./localnet/scripts/start-sandbox.sh
# OR equivalently (what the script wraps):
java --add-opens=java.base/java.lang=ALL-UNNAMED \
  -jar "$HOME/.daml/sdk/3.4.9/canton/canton.jar" \
  sandbox \
  --ledger-api-port 6865 \
  --admin-api-port 6866 \
  --json-api-port 7575 \
  --static-time \
  --dar .daml/dist/cbtc-collateral-desk-0.1.0.dar
```

Wait for:

```text
Listening at ports: 6865(gRPC) and 7575(HTTP)
Canton sandbox is ready.
```

Ports (see `localnet/configs/ports.env`):

| Service | Port |
| --- | --- |
| Ledger API (gRPC) | `6865` |
| Admin API | `6866` |
| JSON API (HTTP) | `7575` |

`--static-time` is required for demos that call `passTime` (interest accrual).

### 3. Upload DAR (optional if started with `--dar`)

```bash
./localnet/scripts/upload-dar.sh
# OR:
daml ledger upload-dar --host localhost --port 6865 \
  --no-legacy-assistant-warning \
  .daml/dist/cbtc-collateral-desk-0.1.0.dar
```

### 4. Allocate parties

Required names: **Desk**, **CreditOfficer**, **Lender**, **Borrower**, **Liquidator**  
(+ demo companions **MockIssuer**, **GroftyAuth**).

```bash
./localnet/scripts/allocate-parties.sh
# OR:
daml ledger allocate-parties --host localhost --port 6865 \
  --no-legacy-assistant-warning \
  Desk CreditOfficer Lender Borrower Liquidator MockIssuer GroftyAuth

daml ledger list-parties --host localhost --port 6865 \
  --no-legacy-assistant-warning
```

Example allocated IDs (suffix is participant namespace; changes each sandbox restart):

```text
Desk::1220…
CreditOfficer::1220…
Lender::1220…
Borrower::1220…
Liquidator::1220…
```

> `Desk.Demo` scripts call `allocateParty` themselves for CreditOfficer/Lender/Borrower/Liquidator/MockIssuer/GroftyAuth. Pre-allocation proves Ledger Admin API works and gives stable display names for UI/backends. Demo scripts create *additional* hinted parties on each run.

### 5. Run demos against Ledger API (not ide-ledger)

```bash
# Happy path (propose → accept → lock → disburse → repay)
./localnet/scripts/run-demo-ledger.sh Desk.Demo:runHappyPath

# Liquidate path — use a FRESH sandbox (or RESET_BETWEEN=1).
# Running both demos on one sandbox can fail: allocateParty display-name collision.
./localnet/scripts/stop-sandbox.sh
./localnet/scripts/start-sandbox.sh
./localnet/scripts/run-demo-ledger.sh Desk.Demo:runLiquidatePath
```

Equivalent raw commands:

```bash
daml script \
  --dar .daml/dist/cbtc-collateral-desk-0.1.0.dar \
  --script-name Desk.Demo:runHappyPath \
  --ledger-host localhost --ledger-port 6865 \
  --static-time --upload-dar true \
  --no-legacy-assistant-warning
```

### 6. Stop

```bash
./localnet/scripts/stop-sandbox.sh
# or Ctrl+C in the sandbox terminal / kill the java canton.jar process
```

### Status helper

```bash
./localnet/scripts/status.sh
```

---

## Path B — multi-participant (startable)

OSS simple topology matching Canton 3.4 docs: **sequencer1 + mediator1 + participant1 + participant2** (in-memory), bootstrapped via Canton console.

### Ports (`localnet/configs/path-b.env`)

| Node | Ledger API | Admin API | JSON API |
| --- | --- | --- | --- |
| participant1 (Desk / CreditOfficer / MockIssuer) | `5011` | `5012` | `5013` |
| participant2 (Lender / Borrower / Liquidator / GroftyAuth) | `5021` | `5022` | `5023` |
| sequencer1 public / admin | `5001` / `5002` | | |
| mediator1 admin | `5202` | | |

Does **not** collide with Path A `:6865` / `:6866` / `:7575`.

### Exact commands

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$HOME/.daml/bin:$PATH"

# Foreground (dedicated terminal) OR background:
./localnet/scripts/start-multi.sh
BACKGROUND=1 ./localnet/scripts/start-multi.sh   # waits for PATH_B_BOOTSTRAP_READY

./localnet/scripts/status-multi.sh
./localnet/scripts/proof-multi.sh                # both Ledger ports + list-parties
./localnet/scripts/upload-dar-multi.sh           # DAR → p1 and p2
./localnet/scripts/allocate-parties-multi.sh     # idempotent; bootstrap already enables
./localnet/scripts/stop-multi.sh
```

Configs / bootstrap:

- `localnet/configs/multi-participant.conf` — sequencer + mediator + 2 participants
- `localnet/configs/bootstrap-multi.canton` — `bootstrap.synchronizer` → `connect_local` → `parties.enable`
- `localnet/configs/path-b.env` — ports

### Honest limits (privacy / Desk.Demo)

- **Proven:** multi-node bring-up, synchronizer connect, both Ledger APIs listening, party hosting split (p1 local Desk/CreditOfficer/MockIssuer; p2 local Lender/Borrower/Liquidator/GroftyAuth), DAR upload to both, clean stop.
- **Not proven:** sub-transaction privacy demo across validators; `health.ping` / `maybe_ping` are disabled or flaky on the bundled OSS `canton.jar` (testing commands) — do not treat ping as a hard gate.
- **Desk.Demo:** scripts call `allocateParty` for **all** roles on **one** participant. Cross-participant `Desk.Demo:runHappyPath` will **not** run as-is. Keep Path A / ide-ledger for happy+liquidate demos. Path B is the multi-node topology proof.
- Optional Path A overlay (unchanged): `localnet/configs/sandbox-parties.conf` for declarative parties on sandbox.

---

## Path C — official CN LocalNet (helper)

When you need **multi-validator** LocalNet (SV + app-provider + app-user), wallets, or Canton Coin.

### Helper (preferred)

```bash
./localnet/scripts/path-c-setup.sh
# → shallow-clones digital-asset/cn-quickstart into localnet/cn-quickstart (gitignored)
# → prints make install / make start + how to point Desk DAR at their Ledger/JSON API
# Does NOT pull multi-GB images or `make start` unless CN_QUICKSTART_START=1
```

Manual equivalent:

```bash
git clone --depth 1 https://github.com/digital-asset/cn-quickstart
cd cn-quickstart
make install
make start   # heavy — you run this intentionally
```

Docs:

- [CN Quickstart](https://docs.canton.network/sdks-tools/reference-projects/cn-quickstart)
- [Splice LocalNet (docker-compose)](https://docs.sync.global/app_dev/testing/localnet.html)
- Sandbox vs LocalNet: [Sandbox](https://docs.canton.network/sdks-tools/development-tools/sandbox)

`localnet/docker-compose.yml` in this repo is an intentional stub (empty `services`) so nobody accidentally `compose up`s a fake stack. Prefer cn-quickstart’s compose.

JSON Ledger API after cn-quickstart is typically `http://json-ledger-api.localhost` (or `:7575` depending on build). Point env at that host; reuse the same `daml ledger` / `daml script --ledger-host` flow once parties exist on a validator.

**Honesty:** unless you set `CN_QUICKSTART_START=1` or ran `make start` yourself, the Path C Docker stack was **not** started from this repo’s helpers.

---

## Layout

```text
localnet/
  configs/
    parties.txt              # Desk, CreditOfficer, Lender, Borrower, Liquidator, …
    ports.env                # Path A: 6865 / 6866 / 7575
    path-b.env               # Path B ports (5011/5021/…)
    sandbox-parties.conf     # alpha-dynamic DAR + parties overlay
    multi-participant.conf   # Path B: sequencer + mediator + 2 participants
    bootstrap-multi.canton   # Path B console bootstrap
  scripts/
    _env.sh
    start-sandbox.sh / stop-sandbox.sh / status.sh
    upload-dar.sh / allocate-parties.sh / run-demo-ledger.sh
    start-multi.sh / stop-multi.sh / status-multi.sh
    upload-dar-multi.sh / allocate-parties-multi.sh / proof-multi.sh
    path-c-setup.sh          # Path C cn-quickstart helper
  docker-compose.yml         # stub → use cn-quickstart / path-c-setup.sh
  cn-quickstart/             # gitignored clone (Path C helper)
  logs/                      # gitignored runtime logs
  run/                       # gitignored pid/port files
LOCALNET.md                  # this file
```

---

## Relation to ide-ledger demos

Existing scripts still work without a sandbox:

```bash
./scripts/run-demo.sh    # --ide-ledger --static-time
./scripts/run-tests.sh   # daml test
```

Path A is the **Ledger API** proof for Point 5. Keep `daml test` green; LocalNet does not replace unit Script tests.

---

## Honest limits

- Path A is **single-participant** Canton sandbox (real Ledger API + synchronizer), not multi-validator CN LocalNet — still the path for `Desk.Demo` Ledger API runs.
- Path B proves **multi-node bring-up + party hosting split**; it does **not** run `Desk.Demo` cross-participant, and does **not** by itself prove ACS privacy demos.
- Full CN LocalNet Docker stack is **helper-documented** (Path C); not started unless you run `make start` / `CN_QUICKSTART_START=1`.
- `BACKGROUND=1` nohup may be reaped by some agent shells — prefer a dedicated terminal (foreground) for long-lived Path A/B daemons.
