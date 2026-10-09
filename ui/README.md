# CBTC Collateral Desk — Operator Console

Thin **credit-officer** UI for the bilateral CBTC lending demo.

Stack: **Vite + React + TypeScript**. Local mock desk state + **Grofty mock/live** (CIP-0103 via `@cbtc-collateral-desk/grofty/browser`).

## Run

```bash
# From repo root — build grofty once (also done by file: dependency install)
cd integrations/grofty && npm install && npm run build && cd ../..

cd ui
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Other scripts:

```bash
npm run build    # tsc + production bundle (includes dapp-sdk chunk for live)
npm run preview  # serve the build
```

## Grofty mock vs live

The **Grofty (CIP-103)** panel at the top of the console:

| Control | Offline mock | Live (needs whitelist) |
|---------|--------------|-------------------------|
| Mode toggle | Default | Select **Live** |
| Probe provider | Reports mock | Detects CIP-103 announce / extension |
| Connect | Instant mock accounts | Opens CIP-103 wallet picker (Grofty) |
| Prove RequestAuthorization | Builds + mock “submit” | `prepareExecute` when provider present |
| RequestAuthorization → Grant | Mock Grant payload | `prepareExecute` + `prepareExecuteAndWait(Grant)` — paste proposal cid from ACS |

**Live setup (exact):**

1. Install https://grofty.cc/download — extension id `ojlgdkgfbpkjceancgnniegbgadgmhig`
2. Whitelist / onboard https://grofty.cc/docs/quick-start — copy Party ID
3. Upload Desk DAR to the synchronizer that party uses
4. UI → Live → Probe → Connect → Prove RequestAuthorization → Grant

If the extension is missing, the UI shows `GroftyExtensionMissingError` with install/whitelist links. Switch back to **Mock** to keep demoing the desk flow offline.

Vite notes: `vite.config.ts` aliases `@cbtc-collateral-desk/grofty/browser` to package source; mock no longer imports `node:crypto`.

## What it covers

Step console for one bilateral loan:

| Step | UI action | Mock / Daml mapping |
|------|-----------|---------------------|
| 1. Propose | CreditOfficer sets `LoanTerms` | `LoanProposal` create |
| 2. Accept | Lender then borrower accept | `LenderAccept` → `BorrowerAccept` → `AcceptedTerms` |
| 3. Lock | Lock CBTC into Desk vault | `AcceptedTerms.LockAndPrepare` + Grofty `desk.lock-collateral` |
| 4. Disburse | Lender funds USDCx | `ReadyToDisburse.Disburse` + `desk.disburse` |
| 5. Repay | Full repay + release CBTC | `Loan.Repay` → `ReleaseToBorrower` + `desk.repay` |
| 6. Liquidate | Stress mark → HF&lt;1 → seize | `Loan.Liquidate` → `SeizeToLiquidator` + `desk.liquidate` |

Defaults match `daml/Desk/Demo.daml` happy path (100k USDCx / 2 CBTC @ 80k, maxLtv 0.70, liq threshold 0.85).

**Role split (unchanged):** Grofty authorizes borrower / lender / liquidator only. Desk / CreditOfficer is never Grofty-authorized.

## Layout

```
ui/src/
  App.tsx
  types.ts
  lib/hf.ts
  lib/groftyBrowser.ts   # wraps @cbtc-collateral-desk/grofty/browser
  lib/deskApi.ts         # local workflow + mode-aware Grofty client
  components/
    GroftyPanel.tsx      # mock/live toggle + prove RequestAuthorization → Grant
    Propose / Accept / Lock / Disburse / Repay / Liquidate / …
```

## Ledger API (Path A sandbox) — wired

The console drives a **real Canton Ledger API** when one is reachable, and falls
back to in-memory mock when it is not (the header badge shows which):

| File | Role |
| --- | --- |
| `lib/ledgerClient.ts` | Canton JSON Ledger API v2 client (`/v2/parties`, `/v2/commands/submit-and-wait-for-transaction`) |
| `lib/ledgerDeskApi.ts` | Same `DeskApi` surface as `deskApi.ts`, every step submits real commands (mirrors `daml/Desk/Demo.daml`) |
| `lib/useLedger.ts` | Pings the ledger, resolves/allocates the on-ledger parties, swaps the console to the ledger backend |

The JSON API sends no CORS headers, so requests go through the Vite dev proxy
`/ledger` → `http://localhost:7575` (override with `VITE_LEDGER_PROXY`).

### Run it against LocalNet

```bash
# Terminal 1 — Path A sandbox (from repo root)
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$HOME/.daml/bin:$PATH"
./localnet/scripts/start-sandbox.sh          # or BACKGROUND=1 ...

# Terminal 2 — console
cd ui && npm run dev                          # http://localhost:5173/#/desk
```

Open the console: the badge reads **Ledger: live (/v2)** and every button submits
a real transaction. With no sandbox, it reads **Ledger: mock** and the same flow
runs in memory.

Notes: the ledger path uses a local `GroftyAuth` stand-in party for authorization
(no wallet needed on LocalNet); contract ids are the real ledger cids. The
hosted site (collat.trade) has no ledger, so it stays mock + live-Grofty-signing.

## Demo tips

1. Propose (defaults OK) → Lender accept → Borrower accept → Lock → Disburse.
2. **Happy path:** Repay.
3. **Default path:** Reset → Disburse → Liquidate step → **Apply stress mark** (e.g. 40 000) → Liquidate.
4. Optionally toggle Grofty **Live** only when extension + whitelist are ready.

## Out of scope (this UI)

- CIP-0112 MainNet pins, live DecMan, multi-participant privacy proof.
- The ledger path targets Path A sandbox; cross-participant (Path B) is a topology proof only.
