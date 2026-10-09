# Demo recording guide — collat.trade / CBTC Collateral Desk (< 5 minutes)

**Goal:** one continuous recording of a bilateral CBTC loan on Canton: propose → accept → lock CBTC → disburse USDCx → **repay** (happy) **and** **liquidate**, plus the AI desk assistant. Target wall time **under 5 minutes** of on-camera demo (prep before record).

**Narrate:** private bilateral desk (not a money-market pool). Desk holds CBTC custody; lender prefunds USDCx; Grofty = borrower/lender/liquidator auth; DecMan = Desk party (do not fake live Gold).

> Naming: the product is **collat.trade** (hosted at https://collat.trade). The repo/package name stays `cbtc-collateral-desk`.

---

## One-command prep (off-camera)

```bash
export PATH="$HOME/.daml/bin:$PATH"
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
cd ~/Projects/hackathons/current/cbtc-collateral-desk

# Preferred: start Path A sandbox + run the Ledger API demos (happy + liquidate)
SKIP_HEALTH=1 ./scripts/contrib-demo.sh        # expect CONTRIB_DEMO_PASS

# Or the recording-prep wrapper (health + demos + shot-list reminder):
./scripts/prep-demo-record.sh
# Faster if tests/npm already green:
# SKIP_DAML_TEST=1 SKIP_NPM=1 ./scripts/prep-demo-record.sh
```

Then **hit Record** and re-run the demos on camera.

### Checklist before Record

- [ ] Terminal font readable; hide `.env` / secrets
- [ ] Narrate bilateral desk (not a money-market pool)
- [ ] Do not claim live Grofty MainNet / live DecMan / invent CIP-0112 pins
- [ ] Path A sandbox running if using `MODE=ledger` (`./localnet/scripts/status.sh`)
- [ ] Reset between happy and liquidate (`RESET_BETWEEN=1`) so party names don't collide
- [ ] Path B is an optional aside only (multi-node bring-up) — not required for Desk.Demo video

Have ready:

| Asset | Path / note |
| --- | --- |
| Hosted console + assistant | https://collat.trade (mock walkthrough + live Grofty signing + AI) |
| Operator UI (local) | `cd ui && npm run dev` → http://localhost:5173 |
| Ledger API demos | sandbox up → `MODE=ledger RESET_BETWEEN=1 ./scripts/run-full-demo.sh` |
| Contribution evidence | `SKIP_HEALTH=1 ./scripts/contrib-demo.sh` → `CONTRIB_DEMO_PASS` |
| Grofty panel | Mock for the LocalNet story; Live only to show the **real wallet signs** |

---

## Shot list (record in this order)

### 0. Title card (~10 s)

- **collat.trade** — private bilateral CBTC credit on Canton. HackCanton S3, Financial Applications.
- Same desk is the BitSafe **Contribution** integration (LocalNet app + custom Daml).

### 1. Happy path — repay (~1.5 min)

**A — Ledger API (strongest Canton proof, recommended):**

```bash
# Terminal 1: sandbox already running (./scripts/contrib-demo.sh started it)
MODE=ledger RESET_BETWEEN=1 ./scripts/run-full-demo.sh
```

Call out terminal lines as they pass: parties → terms → lock → disburse → repay → collateral release. This is a **real Canton Ledger API** on `:6865`, not `--ide-ledger`.

**B — Operator console (visual):**

1. Open the UI (hosted https://collat.trade/#/desk or `npm run dev`).
2. Propose loan (CreditOfficer) → lender accept → borrower accept.
3. Lock CBTC into Desk vault → Disburse USDCx → Repay (show vault cleared).

### 2. AI desk assistant (~45 s)

On https://collat.trade/#/desk → bottom-right **✦** launcher:

- Ask: *"What is the desk state?"* → it calls `get_desk_state` and answers.
- Ask: *"Explain the current health factor."* → it explains HF/LTV.
- Ask: *"Propose a 100,000 USDCx loan against 2 CBTC."* → it returns a **confirmation card**; show that it **does not run** until you confirm.
- Switch model in the header (provider · model dropdown) to show OpenRouter / Workers AI switching.

Narrate: the assistant **proposes**; the operator confirms — the model can never change state on its own.

### 3. Liquidate path (~1 min)

Same runner executes `Desk.Demo:runLiquidatePath` after happy (sandbox resets between). On the UI: stress the mark → HF < 1 → **LiquidateFast** → seize. Narrate:

- **Fast path:** pre-authorized liquidator; no DecMan threshold wait.
- **Gated path:** `RequestGovernedCustodyRelease` — fail-closed without live DecMan (do not fake).

### 4. Closing (~30–45 s)

- Point at README production readiness / honesty table (CIP-0112 pin, Grofty participant-upload, DecMan Gold blockers).
- BitSafe: `CONTRIB_DEMO_PASS` + `integrations/bitsafe/DecManEvidence.md` (claim **Contribution only**).
- Stop recording. Do **not** invent package hashes or fake MainNet.

---

## Timing budget

| Segment | Target |
| --- | --- |
| Title | 0:10 |
| Happy (real Ledger API) | 1:30 |
| AI assistant | 0:45 |
| Liquidate | 1:00 |
| Honest blockers / tracks | 0:40 |
| **Total** | **≈ 4:05** |

If over time: show the hosted console for the AI + happy path and cut to the terminal only for liquidate.

---

## Commands cheat-sheet

```bash
# Contribution evidence (starts sandbox, happy + liquidate on Ledger API)
SKIP_HEALTH=1 ./scripts/contrib-demo.sh     # CONTRIB_DEMO_PASS

# Full Ledger API happy + liquidate
MODE=ledger RESET_BETWEEN=1 ./scripts/run-full-demo.sh

# Ide-ledger (no sandbox)
./scripts/run-full-demo.sh

# UI
cd ui && npm run dev                         # http://localhost:5173

# Sandbox control
./localnet/scripts/start-sandbox.sh          # foreground
BACKGROUND=1 ./localnet/scripts/start-sandbox.sh
./localnet/scripts/status.sh
./localnet/scripts/stop-sandbox.sh

# Tests + pre-submit health
./scripts/run-tests.sh
./scripts/health-check.sh
```

---

## Do not show / do not claim

- Pool-style money market UX (Alpend/ACME lookalike).
- Minting USDCx.
- CBTC as traditional RWA.
- Live Grofty MainNet loan, or live DecMan Gold, without real evidence.
- Invented CIP-0112 package / instrument hashes.
- The **AI assistant does not sign or submit** anything by itself — always show the confirmation step.
