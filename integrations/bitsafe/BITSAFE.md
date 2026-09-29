# BitSafe / Decentralization Manager — CBTC Collateral Desk

**Status (2026-09-29 IST):** Scaffolding only under `integrations/bitsafe/`.  
**No live DecMan node** is claimed or simulated as production. Desk Daml keeps `FUTURE(DecMan)` markers until a real operator API + topology evidence exists.

Theme for AppsFactory **Decentralizing Apps** = **Decentralized Party / DecMan**, not “use CBTC.” CBTC may appear as collateral/settlement/treasury but does not satisfy the DecMan card by itself.

## Official links

| Resource | URL |
|----------|-----|
| Docs hub | https://docs.bitsafe.finance/ |
| DecMan overview | https://docs.bitsafe.finance/decentralization-manager |
| Prerequisites | https://docs.bitsafe.finance/decentralization-manager/get-started/prerequisites |
| Run locally | https://docs.bitsafe.finance/decentralization-manager/get-started/run-locally |
| Run with Docker | https://docs.bitsafe.finance/decentralization-manager/get-started/run-with-docker |
| Create Decentralized Party | https://docs.bitsafe.finance/decentralization-manager/get-started/create-a-decentralized-party |
| Topology concepts | https://docs.bitsafe.finance/decentralization-manager/concepts-and-development/decentralized-party-and-canton-topology |
| API / workflow reference | https://docs.bitsafe.finance/decentralization-manager/operations-and-reference/api-and-workflow-reference |
| Contributing guide | https://docs.bitsafe.finance/product-suite/decentralization-manager/contributing-guide |
| Open-source repo | https://github.com/DLC-link/decentralization-manager |
| Builder blog | https://blog.bitsafe.finance/p/building-decentralized-apps-on-canton-with-decentralization-manager |
| Public beta announcement | https://blog.bitsafe.finance/p/canton-s-decentralization-layer-is-live-in-public-beta |
| Node-operator matching form | https://bitsafe.typeform.com/to/oU6g8loF |
| Palladium / DecMan adoption (lending reference) | https://blog.bitsafe.finance/p/palladium-adopts-decentralization-manager |
| AppsFactory Season 3 | https://hackathon.appsfactory.cc/season-3 |
| AppsFactory hackathons | https://appsfactory.cc/hackathons |

Re-confirm bounty amounts and Gold vs Contribution exclusivity on the **official AppsFactory challenge cards** before submit (PROJECT_PLAN §6 assumptions: ~50k CC pool; Contribution ~20k LocalNet / Gold ~30k DevNet–MainNet).

---

## Gold vs Contribution (working assumptions)

| Path | Network bar | What you prove | Target apply |
|------|-------------|----------------|--------------|
| **Gold** | DevNet or MainNet **Decentralized Party** hosted via DecMan | Desk party topology + threshold tx confirmation + app governance on real DecMan peers | Apply / request access **by ~4 Oct 2026** (buffer **~2 Oct**) |
| **Contribution** | Canton **LocalNet** + self-hosted DecMan (or documented contribution PR path) | Same three controls against LocalNet participants; open-source contribution / integration evidence | Fallback if Gold node/apply path slips |

Treat Gold and Contribution as **mutually exclusive** until challenge cards say otherwise.

### What **you** must do for Gold by ~4 Oct

1. **Verify the AppsFactory BitSafe / Decentralizing Apps card** (Season 3) for exact eligibility, evidence format, and whether Gold requires a BitSafe-hosted node vs self-hosted DevNet.
2. **Request DecMan access early (buffer ~2 Oct):**
   - Follow staged access notes in the builder blog + docs “get started” path.
   - If you need peer operators: fill https://bitsafe.typeform.com/to/oU6g8loF and contact BitSafe for matching.
   - Ask AppsFactory / BitSafe mentors for any **Gold apply form / whitelist / NaaS DecMan** URL not yet pasted here — drop it into this file when you have it.
3. **Stand up or receive** at least a multi-peer DecMan topology for the **Desk / CreditOfficer custody party** (not Grofty end-user parties).
4. **Capture evidence** for all three controls (see checklist below and `DecManEvidence.md`).
5. **Do not** claim Gold with IDE-ledger-only demos or fake DecMan HTTP stubs.

### LocalNet contribution fallback

1. Clone https://github.com/DLC-link/decentralization-manager and check out an **approved release tag**.
2. Meet [prerequisites](https://docs.bitsafe.finance/decentralization-manager/get-started/prerequisites): Rust ≥1.85, Node ^20.19 / ≥22.12, Docker optional, Daml/dpm as listed, GitHub SSH key for `canton-lib` Docker builds.
3. Point DecMan at LocalNet Admin/Ledger APIs (typical host layout `5001/5002`, `5011/5012`, `5021/5022`):

```bash
git clone https://github.com/DLC-link/decentralization-manager.git
cd decentralization-manager
git checkout <approved-release-tag>
mkdir -p ./development/participant-1
# write development/participant-1/.env from this repo's integrations/bitsafe/.env.example
cargo run -p decman -- -d ./development/participant-1 serve
# UI: http://localhost:8081
```

4. Multi-node: `cd development && docker compose up` (three instances on 8081–8083) **or** run `./integration-tests/run.sh` for the official LocalNet e2e suite.
5. Contribution path evidence: integration notes + PR to DecMan (if in scope) **or** desk-side wiring docs + LocalNet recordings proving the three controls. Follow https://docs.bitsafe.finance/product-suite/decentralization-manager/contributing-guide and repo `docs/CONTRIBUTING.md`.

---

## Three controls — evidence checklist

Map 1:1 to `PROJECT_PLAN.md` §5.3 and `FUTURE(DecMan)` comments in Daml. Prove **separately**; do not collapse into “we use DecMan.”

### 1. Topology ownership

| Evidence | Status |
|----------|--------|
| Desk custody party is a **Decentralized Party** (namespace + PartyToParticipant across ≥2 participants) | ☐ |
| Topology proposal/approval screenshots or Admin API dumps (serial, owners, hosts) | ☐ |
| Maps to `CollateralCustody` / `MockToken` / `Demo` FUTURE markers | ☐ |
| Client hook: `TopologyHooks` / `DECMAN_MODE=scaffold` prints expected workflow only | scaffold |

### 2. Transaction confirmation / hosting threshold

| Evidence | Status |
|----------|--------|
| Threshold confirm → execute path for money-moving Desk actions (lock / release / seize / disburse / liquidate settlement) | ☐ |
| Direct **bypass** test of underlying action without confirmation (must fail or be gated) | ☐ |
| Outage notes: participant vs DecMan coordinator vs app backend | ☐ |
| Maps to `Loan` / `CollateralCustody` / `Auth` FUTURE markers | ☐ |
| Client hook: `TxConfirmationHooks` | scaffold |

### 3. App governance (e.g. 2-of-3)

| Evidence | Status |
|----------|--------|
| Governed change of product params and/or party onboarding (propose → confirm → execute) | ☐ |
| Audit trail of confirmation set | ☐ |
| Maps to `CreditApplication` / `Auth` FUTURE markers | ☐ |
| Client hook: `AppGovernanceHooks` | scaffold |

Liquidation design note (plan §5.3): keep **pre-authorized liquidator** as the fast path; DecMan-gated enforcement is the slower governed path — document both, do not block all liquidations on threshold delay without a fast path.

Full printable checklist: [DecManEvidence.md](./DecManEvidence.md).

---

## Desk FUTURE(DecMan) → client hook map

| Daml location | Control | Scaffold API |
|---------------|---------|--------------|
| `Auth.daml` header + `AuthorizationGranted` evidence fields | 1–3 | `types.ts` evidence payloads |
| `Auth.daml` RequestAuthorization correlation | 1 | `topology.ts` proposal correlation id |
| `CollateralCustody.daml` | 1 topology, 2 tx confirm on lock/release/seize | `topology.ts`, `tx-confirmation.ts` |
| `Loan.daml` disburse / liquidate | 2 (+ gated vs fast liquidator) | `tx-confirmation.ts` |
| `CreditApplication.daml` product params / onboarding | 3 | `app-governance.ts` |
| `Demo.daml` allocateParty | 1 | `topology.ts` onboarding stub |
| `MockToken.daml` Holding registration | 1 | `topology.ts` instrument admin note |

---

## Modes (this package)

| `DECMAN_MODE` | Behavior |
|---------------|----------|
| `scaffold` (default) | Offline stubs: print expected DecMan workflows + evidence shapes. **Never** claims a live node. |
| `http` | Calls a **real** DecMan operator HTTP base URL (`DECMAN_URL`) with bearer token. Requires your running instance. Fail closed if unreachable. |

There is **no** `mock-live` that pretends Gold evidence.

## How to run

```bash
cd integrations/bitsafe
cp .env.example .env   # optional
npm install
npm run build
npm run prove:scaffold   # prints three-control workflow stubs
# When you have a real node:
# DECMAN_MODE=http DECMAN_URL=http://localhost:8081 DECMAN_TOKEN=... npm run prove:http
```

## Files

```
integrations/bitsafe/
  BITSAFE.md              ← this file
  DecManEvidence.md       ← printable three-control checklist
  .env.example
  package.json
  tsconfig.json
  src/
    types.ts
    config.ts
    topology.ts
    tx-confirmation.ts
    app-governance.ts
    client.ts
    index.ts
  scripts/
    prove-decman-hooks.ts
```

## Hard rules

- Do **not** fake a DecMan node, topology dump, or Gold submission.
- Do **not** put DecMan threshold on Grofty end-user auth; Desk signer / custody party is the DecMan subject.
- Grofty stays borrower/lender/liquidator only (`integrations/grofty/`).
