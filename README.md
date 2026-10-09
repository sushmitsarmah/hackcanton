# CBTC Collateral Desk — collat.trade

**HackCanton S3 — Financial Applications**

Private loan-origination and collateral-control workspace for **bilateral CBTC lending on Canton** (not a money-market pool like Alpend/ACME). Hosted console + AI assistant: **https://collat.trade**.

**Status (2026-10-09):**
- **LocalNet Ledger API E2E green** — `./scripts/contrib-demo.sh` → `CONTRIB_DEMO_PASS` (happy + liquidate on real Canton `:6865`).
- **Grofty integrated and proven** — real CIP-103 wallet (`hackcanton::12200e4e…`) connects and signs `AuthorizationGranted`; Desk DAR vetted on the wallet's participant, so the full flow runs end-to-end.
- **AI desk assistant** — assistant-ui front end + a Cloudflare Worker provider layer (OpenRouter / Workers AI / Ollama / OpenAI-compatible).
- BitSafe: claim **Contribution only** (Gold requires a live DecMan node; apply window passed).

Full scope, gates, calendar, and validation: see **[PROJECT_PLAN.md](./PROJECT_PLAN.md)**.

## Quick start (Mac, SDK 3.4.9)

```bash
export PATH="$HOME/.daml/bin:$PATH"
cd /path/to/cbtc-collateral-desk
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
| [`BITSAFE_CONTRIBUTION.md`](./BITSAFE_CONTRIBUTION.md) | BitSafe **Contribution pool** (~20k CC): eligibility, Path A one-shot, honesty vs Gold |
| [`scripts/contrib-demo.sh`](./scripts/contrib-demo.sh) | One-shot Contribution LocalNet demo (health-check + Ledger full demo; optional Path B) |

```bash
./scripts/prep-demo-record.sh             # recording prep (ide-ledger default)
./scripts/health-check.sh                 # pre-submit health (exit 0 = OK)
./scripts/run-full-demo.sh                # ide-ledger happy + liquidate
MODE=ledger ./scripts/run-full-demo.sh    # Ledger API :6865 (sandbox up)
./scripts/contrib-demo.sh                 # Contribution pool one-shot (Path A)
# WITH_PATH_B=1 ./scripts/contrib-demo.sh # + optional Path B proof-multi
# Path B: BACKGROUND=1 ./localnet/scripts/start-multi.sh && ./localnet/scripts/proof-multi.sh
# Path C: ./localnet/scripts/path-c-setup.sh   # clone + docs; no heavy pull by default
# SKIP_DAML_TEST=1 SKIP_NPM=1 ./scripts/health-check.sh   # faster ping-only style
```

## Operator console (UI) — collat.trade

Credit-officer console (propose → accept → lock → disburse → repay / liquidate) with local mock ledger state, **Grofty mock/live** (CIP-0103), and a built-in **AI desk assistant** (assistant-ui + a Cloudflare Worker provider layer).

**Hosted:** https://collat.trade — `/` is the landing page, `/#/desk` is the console.

```bash
cd ui
npm install
npm run dev
npm run build && npx wrangler deploy   # deploys the SPA + /api/* Worker
```

- **AI assistant:** floating launcher on the console. Providers: OpenRouter (default), Cloudflare Workers AI (native binding or token), Ollama / Ollama Cloud, any OpenAI-compatible endpoint. The model can **propose** actions (`propose_terms`, `desk_action`) but a state change needs an explicit operator confirmation — see `worker/ai/`. Set keys with `wrangler secret put` (see `ui/.dev.vars.example`).
- **Grofty:** Mock for offline/LocalNet; Live when the extension is present. Live Grofty is **proven**: the wallet signs `AuthorizationGranted` on Canton. A live *loan* additionally requires the Desk DAR to be vetted on the participant hosting the wallet party (the wallet itself cannot upload packages).

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
| `scripts/contrib-demo.sh` | Contribution pool LocalNet one-shot (Path A; optional Path B) |
| `BITSAFE_CONTRIBUTION.md` | BitSafe Contribution eligibility + commands (vs Gold) |
| `SUBMIT_CHECKLIST.md` | Freeze/submit checklist (tracks, BitSafe, Grofty, DAR, video) |
| `LOCALNET.md` | Canton Path A sandbox / Path B multi / Path C cn-quickstart helper |
| `integrations/grofty/` | CIP-103 / Grofty client (`mock` or `live`) + `GROFTY.md` |
| `integrations/grofty/scripts/prove-auth-flow.ts` | Smallest RequestAuthorization to Grant path |
| `integrations/bitsafe/` | DecMan / Decentralized Party scaffolding (`BITSAFE.md`, hooks) |
| `integrations/bitsafe/DecManEvidence.md` | Three-control evidence checklist (Gold / LocalNet) |
| `ui/` | Credit-officer operator console (Vite + React + TS; mock desk + Grofty mock/live CIP-103) — see [ui/README.md](./ui/README.md) |

## Production readiness

### Hardened in this repo (Daml / LocalNet)

- **Mandatory auth** on money-moving choices when `AuthPolicy.authRequired=True` (production default): Lock, Disburse, AddCollateral / VaultAddCollateral, Repay, LiquidateFast / Liquidate, ReleaseToBorrower, SeizeToLiquidator. Uses `requireAuthWhen` → fail closed if `AuthorizationGranted` is missing or subject/role/purpose mismatch. Demos grant purpose-specific auth (prefer this over `demoAuthOptional`).
- **Trusted authority**: `AuthPolicy.trustedAuthority` (set via `productionAuthWith`; `None` = legacy) binds every `AuthorizationGranted` to the Grofty authority party, closing the self-grant hole where any party could create evidence. Covered by `testDisburseFailsUntrustedAuthority` / `testDisburseAcceptsTrustedAuthority`.
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
| **Grofty SDK** | **Live and proven** under `integrations/grofty/` (`@canton-network/dapp-sdk` + mock). Whitelist + Party ID done; DAR vetted on the wallet's participant — see [integrations/grofty/GROFTY.md](./integrations/grofty/GROFTY.md). |
| **DecMan node** | Scaffold under `integrations/bitsafe/` + Daml `FUTURE(DecMan)` markers — three controls not live; **no fake DecMan**. Gold apply ~4 Oct or LocalNet **Contribution** — see [BITSAFE_CONTRIBUTION.md](./BITSAFE_CONTRIBUTION.md) / [BITSAFE.md](./integrations/bitsafe/BITSAFE.md). |
| **Multi-participant Canton** | **Path A verified** for `Desk.Demo` (`:6865`). **Path B startable:** 2 participants + synchronizer (`start-multi.sh`, ports `:5011`/`:5021`) — party hosting split proven; Desk.Demo cross-participant **not** as-is. **Path C** = cn-quickstart helper (`path-c-setup.sh`); stack not started by default. |


### Grofty integration (borrower / lender / liquidator only)

**Wallet party ID:** `hackcanton::12200e4ef2cdd5d1dad5738efb6dc5ed0b0001834aea8b9d2d29a6537702e943eff9`
(Overridable with `VITE_GROFTY_AUTHORITY_PARTY`; shown live in the UI Grofty panel after **Connect**.)

Full access steps, CIP-103 notes, and file map: **[integrations/grofty/GROFTY.md](./integrations/grofty/GROFTY.md)**.

**Role split:** Grofty authorizes **borrower / lender / liquidator only**. Desk / CreditOfficer is **never** Grofty-authorized (stays separate; DecMan subject).

### Grofty Wallet Bounty — requirement status

Bounty: **Grofty Wallet — Wallet & Onboarding** (10,000 CC; open to any S3 track).
Bar: *"demonstrate an end-to-end flow using Grofty on MainNet."*

| Requirement | Status | Evidence |
| --- | --- | --- |
| Install Grofty wallet | ✅ Done | Chrome/Edge extension, id `ojlgdkgfbpkjceancgnniegbgadgmhig` |
| Create wallet / get Party ID | ✅ Done | `hackcanton::12200e4e…` (above) |
| Onboarding / whitelist | ✅ Done | Wallet funded (CC + USDCx); appears in wallet profile |
| CIP-0103 dApp connect from our app | ✅ Done | Console → Grofty panel → Live → **Connect** returns the party id; discovery via `canton:announceProvider` + Splice handshake |
| **Sign a transaction with the wallet** | ✅ Done | Wallet signs `AuthorizationGranted` on Canton |
| Auth wired into the app | ✅ Done | `AuthPolicy.trustedAuthority` + `requireAuthWhen` bind grants to this party; passed into Daml choices |
| **End-to-end loan flow on MainNet** | ✅ Done | Desk DAR vetted on the wallet's participant; the console drives the full flow (propose → accept → lock → disburse → repay / liquidate) with the wallet signing authorizations |
| Small real transaction | ✅ Done | CC transfer + CC→USDCx swap in-wallet |

**Summary:** the full **wallet → connect → authorize → sign → settle** flow runs on Canton with this party end-to-end. See [integrations/grofty/GROFTY.md](./integrations/grofty/GROFTY.md) for the exact access steps and the UI walkthrough in [scripts/demo-runbook.md](./scripts/demo-runbook.md).

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

**Blockers / access**

| Item | Status |
|---------|--------|
| Grofty whitelist / Party ID | ✅ Done — `hackcanton::12200e4e…`, funded wallet (CC + USDCx) |
| Extension CIP-103 announce | ✅ Done — appears to the dapp-sdk (`canton:announceProvider`) |
| Desk DAR on the wallet's participant | ✅ Done — vetted; the custom contract executes on the wallet's participant |
| CIP-0112 pins / DecMan | Out of scope for Grofty — do not fake |

### Contribution pool (BitSafe LocalNet ~20k CC)

**Plan:** prepare Contribution always; **claim Contribution only if not submitting Gold** (Gold applicants are ineligible for the Contribution pool until cards say otherwise). If Gold / DecMan node never approved → skip Gold; submit Contribution.

| Step | Command |
|------|---------|
| One-shot Path A | `./scripts/contrib-demo.sh` → expect `CONTRIB_DEMO_PASS` |
| Manual | `./scripts/health-check.sh` then sandbox + `MODE=ledger ./scripts/run-full-demo.sh` |
| Optional Path B | `BACKGROUND=1 ./localnet/scripts/start-multi.sh` then `./localnet/scripts/proof-multi.sh` |

Full eligibility, video checklist, honesty: **[BITSAFE_CONTRIBUTION.md](./BITSAFE_CONTRIBUTION.md)**. LocalNet details: [LOCALNET.md](./LOCALNET.md).

### BitSafe / Decentralization Manager (Desk party)

- **Package:** `integrations/bitsafe` — `DECMAN_MODE=scaffold|http`. Scaffold maps to three controls (topology, tx confirmation, app governance); `http` probes a **real** DecMan `/node-config` only.
- **Docs / Gold vs Contribution / checklist:** [BITSAFE_CONTRIBUTION.md](./BITSAFE_CONTRIBUTION.md), [integrations/bitsafe/BITSAFE.md](./integrations/bitsafe/BITSAFE.md), [DecManEvidence.md](./integrations/bitsafe/DecManEvidence.md).
- **Run scaffold prove:** `cd integrations/bitsafe && npm install && npm run prove:scaffold`
- **Do not fake** a live DecMan node or Gold topology dumps. Chase Gold apply by **~4 Oct 2026** (buffer ~2 Oct); else claim LocalNet **Contribution** (this desk’s Path A integration + custom Daml) — see [BITSAFE_CONTRIBUTION.md](./BITSAFE_CONTRIBUTION.md). Optional DecMan OSS LocalNet: [DLC-link/decentralization-manager](https://github.com/DLC-link/decentralization-manager).
- Desk / CreditOfficer custody party is the DecMan subject; Grofty stays borrower/lender/liquidator only.


## Notes

- CBTC = Bitcoin-backed collateral on Canton — **not** traditional RWA language.
- Desk disburses **prefunded** lender USDCx (no minting).
- Canton-only — do not merge with multi-chain USDC payment apps.
