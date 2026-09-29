# CBTC Collateral Desk

**HackCanton S3 — Financial Applications**

Private loan-origination and collateral-control workspace for **bilateral CBTC lending on Canton** (not a money-market pool like Alpend/ACME).

Full scope, gates, calendar, and validation: see **[PROJECT_PLAN.md](./PROJECT_PLAN.md)**.

## Quick start (Mac, SDK 3.4.9)

```bash
export PATH="$HOME/.daml/bin:$PATH"
cd ~/Projects/hackathons/current/cbtc-collateral-desk
daml build
./scripts/run-demo.sh
./scripts/run-tests.sh
# or:
daml test
daml script --dar .daml/dist/cbtc-collateral-desk-0.1.0.dar \
  --script-name Desk.Demo:runHappyPath --ide-ledger --static-time
```

**Demo metric:** one E2E bilateral loan (propose → accept → lock CBTC → disburse USDCx → repay or liquidate) in **under 5 minutes**.

## Observability, demo recording, submit

| Entry | What |
|-------|------|
| [`scripts/health-check.sh`](./scripts/health-check.sh) | Daml build + test, optional LocalNet sandbox ping, grofty/bitsafe/ui `npm run build` |
| [`scripts/prep-demo-record.sh`](./scripts/prep-demo-record.sh) | One-command recording prep (health + demos + shot-list checklist; you still hit Record) |
| [`scripts/run-full-demo.sh`](./scripts/run-full-demo.sh) | Happy + liquidate (ide-ledger default; `MODE=ledger` for sandbox) |
| [`scripts/demo-record.md`](./scripts/demo-record.md) | Ordered <5 min recording shot list (happy + liquidate) |
| [`LOCALNET.md`](./LOCALNET.md) | Path A sandbox · Path B multi-participant · Path C cn-quickstart helper |
| [`SUBMIT_CHECKLIST.md`](./SUBMIT_CHECKLIST.md) | HackCanton freeze/submit checklist (tracks, BitSafe, Grofty, DAR, video, README) |

```bash
./scripts/prep-demo-record.sh             # recording prep (ide-ledger default)
./scripts/health-check.sh                 # pre-submit health (exit 0 = OK)
./scripts/run-full-demo.sh                # ide-ledger happy + liquidate
MODE=ledger ./scripts/run-full-demo.sh    # Ledger API :6865 (sandbox up)
# Path B: BACKGROUND=1 ./localnet/scripts/start-multi.sh
# Path C: ./localnet/scripts/path-c-setup.sh   # clone + docs; no heavy pull by default
# SKIP_DAML_TEST=1 SKIP_NPM=1 ./scripts/health-check.sh   # faster ping-only style
```

## Operator console (UI)

Thin credit-officer demo console (propose → accept → lock → disburse → repay / liquidate) with local mock ledger state and **Grofty mock/live** (CIP-0103). Toggle Live in the Grofty panel when the extension + whitelist are ready.

```bash
cd ui
npm install
npm run dev
```

Details, whitelist steps, and Ledger API notes: **[ui/README.md](./ui/README.md)**. Grofty package docs: **[integrations/grofty/GROFTY.md](./integrations/grofty/GROFTY.md)**.

## Layout

| Path | Role |
|------|------|
| `daml/Desk/Types.daml` | Parties, LoanTerms, AuthPolicy, Debt, HF/LTV |
| `daml/Desk/TokenPin.daml` | CIP-0112 package/interface/instrument ID placeholders (CBTC, USDCx) |
| `daml/Desk/TokenAdapter.daml` | HoldingView + Transferable; Transfer/GetView expectations |
| `daml/Desk/MockToken.daml` | LocalNet MockHolding behind HoldingCid (default DeskHolding) |
| `TOKEN_PIN.md` | Checklist to fill real DevNet/MainNet pin IDs (do not invent hashes) |
| `daml/Desk/Auth.daml` | Grofty async auth stubs + requireAuthWhen (fail closed) |
| `daml/Desk/CreditApplication.daml` | CreditOfficer propose → lender/borrower accept → AcceptedTerms |
| `daml/Desk/CollateralCustody.daml` | Vault + claim; Release/Seize + RequestGovernedCustodyRelease |
| `daml/Desk/Loan.daml` | Disburse / Accrue / AddCollateral / Repay / LiquidateFast |
| `daml/Desk/Demo.daml` | LocalNet / IDE-ledger scripts (production auth grants) |
| `daml/Desk/Tests.daml` | Happy / liquidate / auth / edge-case Script tests |
| `scripts/run-demo.sh` | Build + happy + liquidate paths (ide-ledger) |
| `scripts/run-tests.sh` | Build + `daml test` |
| `scripts/health-check.sh` | Observability: daml build/test, LocalNet ping, npm builds |
| `scripts/run-full-demo.sh` | Full demo runner (ide-ledger or `MODE=ledger`) |
| `scripts/demo-record.md` | <5 min demo recording shot list |
| `scripts/prep-demo-record.sh` | One-command recording prep |
| `SUBMIT_CHECKLIST.md` | HackCanton freeze/submit checklist |
| `LOCALNET.md` | Canton Path A sandbox / Path B multi / Path C cn-quickstart helper |
| `integrations/grofty/` | CIP-103 / Grofty client (`mock` or `live`) + `GROFTY.md` |
| `integrations/grofty/scripts/prove-auth-flow.ts` | Smallest RequestAuthorization to Grant path |
| `integrations/bitsafe/` | DecMan / Decentralized Party scaffolding (`BITSAFE.md`, hooks) |
| `integrations/bitsafe/DecManEvidence.md` | Three-control evidence checklist (Gold / LocalNet) |
| `ui/` | Credit-officer operator console (Vite + React + TS; mock desk + Grofty mock/live CIP-103) — see [ui/README.md](./ui/README.md) |

## Production readiness

### Hardened in this repo (Daml / LocalNet)

- **Mandatory auth** on money-moving choices when `AuthPolicy.authRequired=True` (production default): Lock, Disburse, AddCollateral / VaultAddCollateral, Repay, LiquidateFast / Liquidate, ReleaseToBorrower, SeizeToLiquidator. Uses `requireAuthWhen` → fail closed if `AuthorizationGranted` is missing or subject/role/purpose mismatch. Demos grant purpose-specific auth (prefer this over `demoAuthOptional`).
- **Custody invariants:** Desk (`creditOfficer`) owns locked CBTC; vault amount matches holding and claim; Loan.Repay / LiquidateFast exit custody only via `ReleaseToBorrower` / `SeizeToLiquidator` (no direct Transfer of `lockedCbtc` from Loan).
- **Liquidation path split (Point 6):**
  - **Fast path:** `Loan.LiquidateFast` (alias `Liquidate`) — designated prefunded liquidator when HF < 1 or past maturity; pre-authorized at agreement setup; **does not wait** on DecMan threshold; seizes via `SeizeToLiquidator`.
  - **Gated path:** `CollateralVault.RequestGovernedCustodyRelease` — non-emergency ReleaseToBorrower / admin Seize; `FUTURE(DecMan)` evidence hooks; **not executable** without live DecMan (fail closed; do not fake).
- **Edge guards:** double-lock (AcceptedTerms archived on lock), double-disburse (ReadyToDisburse consuming), underpaid repay, healthy LiquidateFast rejected (HF breach **or** maturity), gated custody release refused without DecMan, wrong asset on lock/add, wrong party controllers.
- **Interest / HF:** pure helpers tested; `Accrue` idempotent per ledger time; revalidate at Disburse / AddCollateral / Repay / LiquidateFast.
- **Tests:** `daml/Desk/Tests.daml` + `./scripts/run-tests.sh` (`daml test`).

### Still blocked (do not fake)

| Blocker | Status |
|---------|--------|
| **CIP-0112 MainNet pin** | Adapter layer in-repo (`TokenPin` / `TokenAdapter` / `HoldingCid`); placeholders only. Fill real IDs via [TOKEN_PIN.md](./TOKEN_PIN.md) before any MainNet claim — do not invent hashes. |
| **Grofty SDK** | **Module ready** under `integrations/grofty/` (`@canton-network/dapp-sdk` + mock). Live MainNet blocked on **your** Grofty whitelist + Party ID + DAR upload — see [integrations/grofty/GROFTY.md](./integrations/grofty/GROFTY.md). |
| **DecMan node** | Scaffold under `integrations/bitsafe/` + Daml `FUTURE(DecMan)` markers — three controls not live; **no fake DecMan**. Gold apply ~4 Oct or LocalNet contribution — see [BITSAFE.md](./integrations/bitsafe/BITSAFE.md). |
| **Multi-participant Canton** | **Path A verified** for `Desk.Demo` (`:6865`). **Path B startable:** 2 participants + synchronizer (`start-multi.sh`, ports `:5011`/`:5021`) — party hosting split proven; Desk.Demo cross-participant **not** as-is. **Path C** = cn-quickstart helper (`path-c-setup.sh`); stack not started by default. |


### Grofty integration (borrower / lender / liquidator only)

Full access steps, CIP-103 notes, and file map: **[integrations/grofty/GROFTY.md](./integrations/grofty/GROFTY.md)**.

**Role split:** Grofty authorizes **borrower / lender / liquidator only**. Desk / CreditOfficer is **never** Grofty-authorized (stays separate; DecMan subject).

**Layout**

| Path | Role |
|------|------|
| `integrations/grofty/GROFTY.md` | Signup, modes, Desk.Auth mapping, blockers |
| `integrations/grofty/src/client.ts` | `GROFTY_MODE` factory (`createGroftyClient`) |
| `integrations/grofty/src/mock-adapter.ts` | Offline deterministic Grant payloads |
| `integrations/grofty/src/live-adapter.ts` | Browser CIP-103 via `@canton-network/dapp-sdk` |
| `integrations/grofty/src/purposes.ts` | Mirrors `Desk.Auth` purpose strings |
| `integrations/grofty/src/commands.ts` | Create / Exercise command builders |
| `integrations/grofty/scripts/prove-auth-flow.ts` | Smallest RequestAuthorization → Grant path |

**Mock vs live**

| `GROFTY_MODE` | When | Behavior |
|---------------|------|----------|
| `mock` (default) | Node, CI, LocalNet demos | Deterministic `AuthorizationGranted` payloads; no keys / extension |
| `live` | Browser + installed Grofty | CIP-103 connect + sign Grant / create RequestAuthorization |

```bash
cd integrations/grofty
npm install
npm run prove:mock     # offline prove — works today
# GROFTY_MODE=live requires browser + whitelist; Node prove exits 2
# Browser live: cd ui && npm run dev → Grofty panel → Live → Connect → Prove
```

**npm:** `@canton-network/dapp-sdk` (CIP-0103). No proprietary Grofty npm SDK.

**Blockers (do not fake live MainNet)**

| Blocker | Status |
|---------|--------|
| Grofty whitelist / Party ID | **You** must complete — blocks live MainNet prove |
| Extension CIP-103 announce | Must appear in dapp-sdk picker (see GROFTY.md) |
| Desk DAR on MainNet synchronizer | Not uploaded from this spike |
| CIP-0112 pins / DecMan | Out of scope for Grofty — do not fake |

### BitSafe / Decentralization Manager (Desk party)

- **Package:** `integrations/bitsafe` — `DECMAN_MODE=scaffold|http`. Scaffold maps to three controls (topology, tx confirmation, app governance); `http` probes a **real** DecMan `/node-config` only.
- **Docs / Gold vs Contribution / checklist:** [integrations/bitsafe/BITSAFE.md](./integrations/bitsafe/BITSAFE.md), [DecManEvidence.md](./integrations/bitsafe/DecManEvidence.md).
- **Run scaffold prove:** `cd integrations/bitsafe && npm install && npm run prove:scaffold`
- **Do not fake** a live DecMan node or Gold topology dumps. Chase Gold apply by **~4 Oct 2026** (buffer ~2 Oct); else LocalNet contribution via [DLC-link/decentralization-manager](https://github.com/DLC-link/decentralization-manager).
- Desk / CreditOfficer custody party is the DecMan subject; Grofty stays borrower/lender/liquidator only.


## Notes

- CBTC = Bitcoin-backed collateral on Canton — **not** traditional RWA language.
- Desk disburses **prefunded** lender USDCx (no minting).
- Canton-only — do not merge with multi-chain USDC payment apps.
