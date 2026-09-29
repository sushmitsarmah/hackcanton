# CBTC Collateral Desk — HackCanton League Season 3 Project Plan

**Last locked:** 2026-09-25 (bilateral positioning 2026-09-25; repo path 2026-09-29)  
**Repo:** `~/Projects/hackathons/current/cbtc-collateral-desk`  
**Separate from:** multi-chain USDC wallet / invoicing / trading app (Arbitrum / Solana / Monad). Do not merge codebases.

---

## 1. Pitch (locked)

> A private loan-origination and collateral-control workspace for bilateral CBTC lending on Canton.

Supporting line: private CBTC-backed USDCx credit with threshold-controlled collateral custody and Grofty-powered borrower transactions.

**Language**
- CBTC = **Bitcoin-backed collateral** on Canton (digital / BTC-backed).
- Do **not** describe CBTC as a traditional real-world asset.
- Do **not** pitch the desk as “RWA lending.” Pitch **private CBTC-collateralized USDCx credit**.

---

## 2. Hackathon targets

| Item | Value |
| --- | --- |
| Event | HackCanton League Season 3 (Canton / AppsFactory) |
| Freeze | **8 Oct 2026** |
| Submit | **9 Oct 2026 23:59 UTC** (India wall clock ~**10 Oct 05:29 IST**; keep internal done on 9 Oct) |
| Finalists | 19 Oct 2026 |
| Grand Final | 21 Oct 2026 14:00 UTC |
| Pool | Up to ~$50k cash & credits |
| Tracks | Up to two allowed; we scope carefully |

**Primary track:** Financial Applications — lending, repayment, and liquidation.

**Secondary (optional):** RWA & Business Workflows — **only** credit-approval + collateral-administration workflow, and **only if** official criteria accept that without forcing an RWA narrative. If the brief wants tokenized T-bills / invoices / legal RWAs → **skip secondary**, stay Financial-only.

---

## 3. Competitive framing (do not ignore)

| Existing app | Overlap |
| --- | --- |
| [Alpend](https://alpend.com/) | Canton CBTC/USDCx lending/borrowing, collateral limits, interest & liquidation params, confidential positions |
| [ACME Lend](https://acmemarkets.cc/) | Canton money markets: collateralized borrow, health factor, repay, liquidate (beta) |
| BitSafe blog (13 Aug; URL slug mentions Palladium) | Alpend-class lending adopted Decentralization Manager for threshold **protocol admin**; ordinary supply/borrow/repay/withdraw/liquidate stay outside that workflow |

**Crowded (do not lead with):** pool money market + health factor + “we use DecMan” + “positions are private.”

**Differentiation (product hypothesis, not proven demand):**

| Money market (Alpend / ACME-style) | Our Desk |
| --- | --- |
| Shared liquidity pools | Named lender funds a **specific** borrower |
| Market-wide params | **Per-loan** agreed terms |
| DecMan on protocol admin | DecMan on **custody + enforcement** for that agreement |
| Retail money-market UX | Credit officers: approve → fund → monitor → close/default |

**Customer evidence (honest, as of 2026-09-25):** 0 interviews, 0 surveys, no signups/usage. Competitor category proves lending/admin-control **exists**, not that desks will adopt our workflow. Unsupported “5–20 users” estimate is **not** evidence.

---

## 4. Demo success metric (one)

> We will know this works when **one complete bilateral loan agreement** is executed end-to-end on Canton LocalNet/DevNet: terms accepted by both parties, CBTC moved into Desk-controlled custody, USDCx disbursed from a named lender, then either full repay with collateral release **or** a governed liquidation — captured in a **single demo recording under 5 minutes**.

Demo story: **agree terms → fund one loan → shared collateral authority → repay or default/liquidate that agreement.**  
Not: deposit → borrow → HF → repay/liquidate as a pool.

---

## 5. Architecture gates (hard)

### 5.1 Token pin (CIP-0112 backdrop)
- Pin exact CBTC / USDCx interfaces on the chosen network (Token Standard V2 / CIP-0112-style).
- Replace loose “CIP-56 Holding” assumptions with pinned DARs, package/interface IDs, registry, instrument IDs.
- Local mocks must match real interfaces.
- Checklist target: ~28 Sep (slippage: ASAP; still block MainNet claims until pinned).

### 5.2 Custody
- CBTC **transferred into Desk-controlled custody** + separate **per-position borrower claim**.
- Invariants:
  - Borrow only after collateral settles
  - Borrower cannot spend locked CBTC
  - No double-pledge
  - Desk **disburses prefunded lender USDCx** (no minting)
  - Repay / liquidate cannot race collateral release
- Do **not** treat CIP-0056-style allocations as durable collateral locks.

### 5.3 DecMan — three separate controls (prove separately)
1. Topology ownership  
2. Transaction confirmation / hosting threshold  
3. App governance (e.g. 2-of-3)  

- Test **direct bypass** of underlying actions.
- Needs Admin API + Ledger API.
- Record outage cases: participant / DecMan coordinator / app backend.
- Risk: threshold delay during liquidation → design pre-authorized liquidator path + clear gated vs fast paths.

### 5.4 Grofty ≠ Desk
- User signs request / allocation; other parties authorize; Desk executes via governed workflow; UI waits for ledger confirmation.
- Grofty authorizes **borrower / lender / liquidator only** — **not** Desk signer.
- Async auth in Daml.
- Prove a **tiny custom Daml choice via Grofty** as early as possible (original bar 25–28 Sep; still critical before Gold / ~4 Oct pressure).
- Treat specific SDK method names as assumptions until SDK proves them; CIP-0103 is vendor-neutral bar.

### 5.5 Narrow MVP
- CBTC in, USDCx out
- One prefunded lender, one loan / position
- Fixed simple interest
- Add collateral / full repay / full liquidate
- Designated prefunded liquidator
- **Out of scope for MVP:** revolving line, partial liquidation, cETH

**Formulas**
- `Debt = Principal + AccruedInterest`
- `HF = CollateralValue × LiquidationThreshold / Debt`
- Max LTV below liquidation threshold; revalidate at execution
- Consuming Repay / Liquidate on Loan is OK

### 5.6 Privacy
- Party-scoped Ledger API proof (Borrower A cannot see Borrower B).
- Not UI row hiding.
- Document Desk / asset-admin / observer disclosure.

---

## 6. Stack & bounties (working assumptions)

Re-confirm on official AppsFactory challenge cards before submit.

| Layer | Choice |
| --- | --- |
| Network | CBTC-first; LocalNet mock fallback behind same interfaces |
| BitSafe | Decentralization Manager on the Desk party; chase **Gold** if node/~apply path viable (~apply by 4 Oct, buffer apply ~2 Oct), else LocalNet contribution path |
| Grofty | Core connect / sign / transact on MainNet for borrower (and related) flows |
| Metatarz / OneSwap | Sponsors/tooling only unless prize cards appear |

**Published pool assumptions (verify):**
- BitSafe Decentralizing Apps ~**50,000 CC** (Contribution ~20k LocalNet / Gold ~30k DevNet–MainNet Decentralized Party). Theme = Decentralized Party / DecMan, **not** “use CBTC.” Gold vs contribution treated mutually exclusive until cards say otherwise. CBTC optional as collateral/settlement/treasury.
- Grofty Wallet ~**10,000 CC** (5k / 3k / 2k). MainNet custom-contract rules — verify on card.

---

## 7. Critical path (green bar)

Operator access → real asset custody → Grofty custom signing → governed settlement.

Original green-by date: **28 Sep**. As of late Sep, treat as **immediate** until each gate is checked off.

---

## 8. Gate calendar (revised)

| Window | Focus |
| --- | --- |
| 25–26 Sep | Foundations + challenge cards / access |
| 27–28 Sep | DecMan + asset + Grofty spikes |
| 29–30 Sep | Custody / loan / repay |
| 1–2 Oct | Liquidation / thresholds / privacy + Gold apply if eligible |
| 3 Oct | Canton maintenance (Open House freeze is the **other** repo) |
| 4 Oct | MainNet tiny flow or explicit blocker |
| 5–6 Oct | Hosted DecMan evidence + UI |
| 7 Oct | Demo + README |
| 8 Oct | **Freeze** |
| 9 Oct | **Submit** 23:59 UTC |

---

## 9. Validation (product, not just protocol)

**48h test (locked 25 Sep):** 5 written responses from people with bilateral / OTC / desk-style crypto credit experience (not pool-only).

Questions:
1. Bilateral loan experience in last 12 months vs pool-only?
2. Who approves terms vs who can move/release collateral?
3. What breaks most: negotiation, lock, disbursement, margin, liquidation?
4. Would threshold approval on custody/enforcement help — yes/no/large-only + why?
5. Willing to dry-run on testnet in 2 weeks — yes/no/maybe + blocker?

**Pass bar:** ≥3/5 bilateral; ≥3/5 custody/enforcement friction; ≥2/5 threshold yes with reason; ≥1/5 dry-run interest.

---

## 10. Implementation modules (repo)

Expected Daml / project shape:
- `Desk.Types` — parties, `LoanTerms`, amounts
- `Desk.TokenPin` — package/interface/instrument ID placeholders (CBTC, USDCx); see TOKEN_PIN.md
- `Desk.TokenAdapter` — HoldingView + Transferable; Transfer/GetView expectations
- `Desk.MockToken` — LocalNet MockHolding default behind HoldingCid / adapter shapes
- `Desk.CreditApplication` — propose / accept bilateral terms (credit-officer style)
- `Desk.CollateralCustody` — Desk custody + borrower claim + invariants
- `Desk.Loan` — disburse, accrue, add collateral, full repay, full liquidate
- `Desk.Auth` — async Grofty-style authorization stubs
- Script / LocalNet demo: parties → mint mocks → propose/accept → lock → disburse → repay **or** liquidate
- DecMan hooks commented as future evidence, not fake-implemented

---

## 11. Explicit non-goals

- Reproducing Alpend/ACME pool UX as the demo
- Minting USDCx
- Pitching CBTC as traditional RWA
- Merging with the multi-chain USDC payment / trading app
- Waiting on Metatarz / OneSwap prize amounts to start

---

## 12. Links

- AppsFactory: https://appsfactory.cc/hackathons  
- Season 3 challenges/prizes: https://hackathon.appsfactory.cc/season-3  
- Alpend docs: https://docs.alpend.com/  
- ACME: https://acmemarkets.cc/  
- BitSafe DecMan adoption post: https://blog.bitsafe.finance/p/palladium-adopts-decentralization-manager  

---

*This file is the source of truth for HackCanton scope. Update it when gates flip; do not silently widen MVP.*

## Implementation status

**Updated:** 2026-09-29 (IST) — Grofty **browser live path** wired (Vite-safe `./browser` entry, UI mock/live toggle, RequestAuthorization → Grant via prepareExecute, clear extension-missing errors). Prior: BitSafe DecMan scaffolding; Daml hardening; Grofty CIP-103 client + mock prove.

**Done in-repo:** AuthPolicy + requireAuthWhen on money-moving choices; vault Release/Seize as only Loan custody exits; double-lock/disburse/underpay/healthy-liquidate/wrong-asset guards; Desk.Tests + run-tests.sh; README Production readiness; Grofty CIP-103 client + **browser E2E path** (`integrations/grofty/` + `ui` Grofty panel); BitSafe DecMan **scaffold** (`integrations/bitsafe/`).

**Still blocked:** CIP-0112 MainNet pin (adapter + TOKEN_PIN.md checklist in-repo; placeholders only — do not invent hashes), Grofty **live** MainNet session (user whitelist/Party ID + DAR upload — code path ready, do not fake), **live** DecMan node / Gold Decentralized Party (apply ~4 Oct buffer ~2 Oct — else LocalNet contribution), multi-participant Canton privacy proof. Do not fake these.
