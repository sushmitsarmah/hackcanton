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
| `AuthorizationGranted` **create** (primary live path) | `authorizeSubject` / `createGrant` → `prepareExecuteAndWait` | **authority** (Grofty wallet) |
| `RequestAuthorization` create | `requestAuthorization` → `prepareExecute` (live) | CreditOfficer (requester) |
| `AuthorizationProposal` create | `buildProposalCreate` (inspection / backend) | CreditOfficer |
| `AuthorizationProposal.Grant` | `grantAuthorization` → `prepareExecuteAndWait` (advanced) | **authority** (Grofty) |

**Why direct create?** `AuthorizationGranted` has `signatory = authority` (`daml/Desk/Auth.daml:93`),
so the Grofty wallet can create the evidence directly — no CreditOfficer proposal
round-trip. `prepareExecuteAndWait` returns only `{tx:{commandId,payload:{updateId}}}`
(no contract id), so `createGrant`/`authorizeSubject` then query the JSON Ledger API
(`/v2/state/active-contracts` via `sdk.ledgerApi`) to recover the real cid. Configure
the resource with `activeContractsResource` if your gateway differs.

Bind the Daml policy to the wallet signer with `productionAuthWith authority`
(`daml/Desk/Types.daml`) so any grant not signed by that party is rejected.

Purposes (must match `Desk.Auth`):

- `desk.lock-collateral`
- `desk.disburse`
- `desk.add-collateral`
- `desk.repay` (also Release)
- `desk.liquidate` (also Seize)
- `desk.governed-custody-release` (gated, FUTURE(DecMan))

## How to run

### Offline mock (works today)

```bash
cd integrations/grofty
npm install
npm run build
npm run prove:mock     # prints RequestAuthorization + Grant payloads

# Config: the npm scripts do NOT auto-load .env. Either export GROFTY_* vars in
# your shell, or pass them to createGroftyClient({...}). See .env.example for the
# names. (The UI is Vite-powered and does read ui/.env.local separately.)
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
4. **RequestAuthorization → Grant** — with the cid field **blank**, the wallet creates
   `AuthorizationGranted` directly and the real cid is discovered via ACS. Paste a
   proposal cid only for the advanced `AuthorizationProposal.Grant` path.
5. Missing extension → clear `GroftyExtensionMissingError` with install / whitelist URLs (switch back to Mock to continue).

**Role model:** the wallet is a single party (e.g. `hackcanton::…`). Make it the
**authority** (`VITE_GROFTY_AUTHORITY_PARTY`, `productionAuthWith`). The
borrower/lender/liquidator can be backend parties; only the authority needs Grofty.

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

## Status (honest)

| Item | Status |
|---------|--------|
| Grofty whitelist / Party ID | ✅ Done — `hackcanton::12200e4ef2cdd5d1dad5738efb6dc5ed0b0001834aea8b9d2d29a6537702e943eff9` |
| Grofty CIP-103 announce | ✅ Done — appears to `@canton-network/dapp-sdk` |
| MainNet wallet flow (create → CC → swap USDCx) | ✅ Done in the wallet |
| App connect + sign (`AuthorizationGranted`) | ✅ Proven — wallet signs via CIP-0103 |
| Custom Desk DAR on the wallet's participant | ⚠️ Blocked — third-party participant, no admin upload (`/v2/dars` unsupported). The custom contract is proven end-to-end on LocalNet. |
| DecMan / CIP-0112 pins | Out of scope — do not fake |

### Grofty Wallet Bounty (MainNet flow)

The bounty asks for an **end-to-end Grofty flow on MainNet**; the wallet flow is
real: create wallet → receive **CC** → swap **CC → USDCx** → connect to this app
via CIP-0103 → the wallet **signs** an `AuthorizationGranted`. Our console drives
this from the Grofty panel (Live → Connect → RequestAuthorization → Grant). Where
our *own* Daml contract cannot run is the third-party participant hosting the
party; that is shown on LocalNet instead.

## References

- Grofty docs: https://grofty.cc/docs  
- Grofty transfer flow: https://grofty.cc/docs/transfer-flow  
- CIP-0103 / dApp SDK: https://github.com/canton-network/wallet/tree/main/sdk/dapp-sdk  
- npm `@canton-network/dapp-sdk`: https://www.npmjs.com/package/@canton-network/dapp-sdk  
