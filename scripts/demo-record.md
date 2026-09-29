# Demo recording guide — CBTC Collateral Desk (< 5 minutes)

**Goal:** one continuous recording of a bilateral CBTC loan on Canton: propose → accept → lock CBTC → disburse USDCx → **repay** (happy) **and** a second pass (or cut) for **liquidate**. Target wall time **under 5 minutes** of on-camera demo (prep before record).

**Narrate:** private bilateral desk (not a money-market pool). Desk holds CBTC custody; lender prefunds USDCx; Grofty = borrower/lender/liquidator auth; DecMan = Desk party (do not fake live Gold).

---

## One-command prep (off-camera)

```bash
export PATH="$HOME/.daml/bin:$PATH"
cd ~/Projects/hackathons/current/cbtc-collateral-desk

# Ide-ledger dry-run + health + shot-list reminder (default):
./scripts/prep-demo-record.sh

# Faster if tests/npm already green:
# SKIP_DAML_TEST=1 SKIP_NPM=1 ./scripts/prep-demo-record.sh

# Ledger API Path A (starts sandbox if START_SANDBOX=1):
# START_SANDBOX=1 MODE=ledger ./scripts/prep-demo-record.sh
```

Then **hit Record** in your screen recorder and re-run `./scripts/run-full-demo.sh` (or `MODE=ledger …`) on camera.

### Checklist before Record

- [ ] Terminal font readable; hide `.env` / secrets
- [ ] Narrate bilateral desk (not a money-market pool)
- [ ] Do not claim live Grofty MainNet / live DecMan / invent CIP-0112 pins
- [ ] Path A sandbox only if using `MODE=ledger`
- [ ] Path B is optional aside only (multi-node bring-up) — not required for Desk.Demo video
- [ ] Path C only if cn-quickstart already running (`./localnet/scripts/path-c-setup.sh` documents; heavy)

Have ready:

| Asset | Path / note |
| --- | --- |
| Repo README + PROJECT_PLAN | One-sentence track pitch |
| Operator UI | `cd ui && npm run dev` → http://localhost:5173 |
| Ide-ledger demos | `./scripts/run-demo.sh` or `./scripts/run-full-demo.sh` |
| Ledger API demos | sandbox up → `MODE=ledger ./scripts/run-full-demo.sh` |
| Grofty panel | Mock mode for offline; Live only if whitelist ready |

---

## Shot list (record in this order)

### 0. Title card (~10 s)

- **CBTC Collateral Desk** — HackCanton S3 Financial Applications
- Bilateral CBTC collateralized lending on Canton (LocalNet / sandbox)

### 1. Happy path — repay (~2 min)

**Preferred on camera (pick one):**

**A — Ide-ledger (reliable, no sandbox):**

```bash
./scripts/run-full-demo.sh
# or: ./scripts/run-demo.sh
```

Call out terminal lines as they pass: parties → terms → lock → disburse → accrue (if shown) → repay → collateral release.

**B — Operator console (visual):**

1. Open UI (`npm run dev`).
2. Propose loan (CreditOfficer) → lender accept → borrower accept.
3. Lock CBTC into Desk vault.
4. Disburse USDCx.
5. Repay → show ReleaseToBorrower / vault cleared.
6. (Optional) Grofty panel: Mock → Prove RequestAuthorization (do not claim MainNet live unless connected).

**C — Ledger API (strongest Canton proof):**

```bash
# Terminal 1: sandbox already running
MODE=ledger ./scripts/run-full-demo.sh
# RESET_BETWEEN=1 is default in this mode (fresh parties between happy/liquidate)
```

### 2. Liquidate path (~1.5 min)

Same runner already executes `Desk.Demo:runLiquidatePath` after happy on ide-ledger.

On UI: drive HF/maturity breach → **LiquidateFast** → SeizeToLiquidator. Narrate:

- **Fast path:** pre-authorized liquidator; no DecMan threshold wait.
- **Gated path:** `RequestGovernedCustodyRelease` — fail-closed without live DecMan (do not fake).

### 3. Closing (~30–45 s)

- Point at README production readiness / honesty table (CIP-0112 pin, Grofty whitelist, DecMan Gold blockers).
- Mention BitSafe three controls + `integrations/bitsafe/DecManEvidence.md` if claiming Decentralizing Apps.
- Stop recording. Do **not** invent package hashes or fake MainNet.

---

## Timing budget

| Segment | Target |
| --- | --- |
| Title | 0:10 |
| Happy (lock → disburse → repay) | 2:00 |
| Liquidate | 1:30 |
| Honest blockers / tracks | 0:40 |
| **Total** | **≈ 4:20** |

If over time: cut UI and run **ide-ledger only** (`./scripts/run-full-demo.sh`).

---

## Commands cheat-sheet

```bash
# One-command prep for recording
./scripts/prep-demo-record.sh

# Full ide-ledger happy + liquidate
./scripts/run-full-demo.sh

# Ledger API (sandbox required)
MODE=ledger ./scripts/run-full-demo.sh
START_SANDBOX=1 MODE=ledger ./scripts/prep-demo-record.sh

# UI after demos
WITH_UI=1 ./scripts/run-full-demo.sh   # starts Vite at end
# or: cd ui && npm run dev

# Tests only
./scripts/run-tests.sh

# Pre-submit health
./scripts/health-check.sh

# Path B multi-node (optional aside — not Desk.Demo)
# BACKGROUND=1 ./localnet/scripts/start-multi.sh && ./localnet/scripts/proof-multi.sh
```

---

## Do not show / do not claim

- Pool-style money market UX (Alpend/ACME lookalike).
- Minting USDCx.
- CBTC as traditional RWA.
- Live Grofty MainNet or live DecMan Gold without real evidence.
- Invented CIP-0112 package / instrument hashes.
