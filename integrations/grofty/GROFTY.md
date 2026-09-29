# Grofty integration — CBTC Collateral Desk

**Status (2026-09-29):** Production-shaped TypeScript client under `integrations/grofty/`.  
**Browser / Vite path wired** via `@cbtc-collateral-desk/grofty/browser` (no `node:crypto`).  
**Live MainNet** needs your Grofty whitelist + extension session; **mock** works offline today.

## What this is

Grofty is a **browser extension wallet** for Canton ([grofty.cc](https://grofty.cc/)). There is **no proprietary `grofty` npm package**. Apps integrate via the vendor-neutral **CIP-0103** dApp API:

| Package | Role |
|--------|------|
| `@canton-network/dapp-sdk` **^1.7.1** | Connect / listAccounts / prepareExecute (browser) |
| `@canton-network/wallet-sdk` | Node wallet-provider SDK — **not** used here (wrong layer) |

Constraint from product plan: Grofty authorizes **borrower / lender / liquidator only** — **not** the Desk / CreditOfficer signer. That matches `daml/Desk/Auth.daml`.

## Modes

| `GROFTY_MODE` | When | Behavior |
|---------------|------|----------|
| `mock` (default) | Node, CI, LocalNet demos, UI offline | Deterministic `AuthorizationGranted` payloads; no keys |
| `live` | Browser + installed Grofty | CIP-103 connect + `prepareExecute` RequestAuthorization / Grant |

## Vite / browser entry

Import from the browser entry (UI does this):

```ts
import { createGroftyClient, detectCip103Provider } from '@cbtc-collateral-desk/grofty/browser'
```

- Mock uses Web Crypto (`crypto.randomUUID`) — **no `node:crypto`**, so Vite bundles cleanly.
- Live **lazy-loads** `@canton-network/dapp-sdk` and throws `GroftyExtensionMissingError` when the CIP-103 provider is absent.
- Package exports: `.` (Node/scripts) and `./browser` (UI).

## Signup / whitelist / extension (live) — what **you** must do

Exact steps:

1. **Install Grofty Wallet**  
   - https://grofty.cc/download  
   - Official Chrome/Edge extension id: **`ojlgdkgfbpkjceancgnniegbgadgmhig`**  
   - Docs: https://grofty.cc/docs/installation  

2. **Create wallet** — write down recovery phrase offline; set PIN.  
   - https://grofty.cc/docs/quick-start  

3. **Join whitelist / complete onboarding** (controlled release).  
   - Until whitelisted, full MainNet connect/sign may be blocked by Grofty.  
   - Copy your **Party ID** from the wallet profile (`name::1220…`).

4. **Network / DAR**  
   - Upload `cbtc-collateral-desk` DAR to the synchronizer your Grofty party uses.  
   - Do **not** fake CIP-0112 pins or DecMan.

5. **Optional:** CIP-103 remote gateway URL — set `GROFTY_REMOTE_GATEWAY_RPC_URL` / pass `remoteGatewayRpcUrl` to the client.

No API key is documented publicly for Grofty dApp connect; access is **extension + whitelist + Party ID**.

## Desk.Auth mapping

| Daml template / choice | Client method | Controller |
|------------------------|---------------|------------|
| `RequestAuthorization` create | `requestAuthorization` → `prepareExecute` (live) | CreditOfficer (requester) |
| `AuthorizationProposal` create | UI/backend or `authorizeSubject` live create | CreditOfficer |
| `AuthorizationProposal.Grant` | `grantAuthorization` → `prepareExecuteAndWait` (live) | **authority** (Grofty) |
| `AuthorizationGranted` evidence | returned payload → pass cid into Loan/Custody | authority signatory |

Purposes (must match `Desk.Auth`):

- `desk.lock-collateral`
- `desk.disburse`
- `desk.add-collateral`
- `desk.repay` (also Release)
- `desk.liquidate` (also Seize)

## How to run

### Offline mock (works today)

```bash
cd integrations/grofty
cp .env.example .env   # optional
npm install
npm run build
npm run prove:mock     # prints RequestAuthorization + Grant payloads
```

### Browser live path (operator UI)

```bash
cd ui
npm install
npm run dev
```

In the UI **Grofty (CIP-103)** panel:

1. Leave **Mock** for offline desk demo (Lock/Disburse/etc. still get mock grants).
2. Or toggle **Live** → **Probe provider** → **Connect**.
3. **Prove RequestAuthorization** — builds CreateCommand; live submits via `prepareExecute`.
4. Paste **AuthorizationProposal** cid (from ACS after create on a real ledger) → **RequestAuthorization → Grant** (`prepareExecuteAndWait`).
5. Missing extension → clear `GroftyExtensionMissingError` with install / whitelist URLs (switch back to Mock to continue).

Live Node prove exits code 2 (no wallet picker):

```bash
GROFTY_MODE=live npm run prove   # exit 2 — use UI instead
```

## Files

```
integrations/grofty/
  GROFTY.md
  .env.example
  package.json          # exports "." and "./browser"
  src/
    id.ts               # Web Crypto ids (Vite-safe)
    errors.ts           # GroftyExtensionMissingError, …
    purposes.ts
    commands.ts
    types.ts
    mock-adapter.ts
    live-adapter.ts     # CIP-103 + detectCip103Provider
    client.ts
    browser.ts          # Vite entry
    index.ts
  scripts/prove-auth-flow.ts
```

## What works offline vs needs whitelist

| Capability | Offline (mock) | Needs extension + whitelist |
|------------|----------------|------------------------------|
| `npm run prove:mock` | ✅ | — |
| UI desk flow + mock grants | ✅ | — |
| UI mode toggle / probe / clear errors | ✅ | — |
| CIP-103 `connect` / `prepareExecute` | — | ✅ |
| Live Grant on MainNet / DevNet | — | ✅ + DAR uploaded + proposal cid from ACS |
| Desk / CreditOfficer via Grofty | ❌ never | ❌ never |

## Blockers (honest)

| Blocker | Status |
|---------|--------|
| Grofty whitelist / Party ID | **User must complete** — blocks live MainNet prove |
| Grofty CIP-103 announce | Extension must appear in dapp-sdk picker |
| Desk DAR on MainNet synchronizer | Not uploaded from this spike |
| DecMan / CIP-0112 pins | Out of scope — do not fake |

## References

- Grofty docs: https://grofty.cc/docs  
- Grofty transfer flow: https://grofty.cc/docs/transfer-flow  
- CIP-0103 / dApp SDK: https://github.com/canton-network/wallet/tree/main/sdk/dapp-sdk  
- npm `@canton-network/dapp-sdk`: https://www.npmjs.com/package/@canton-network/dapp-sdk  
