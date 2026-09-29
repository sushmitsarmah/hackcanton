# HackCanton S3 — freeze / submit checklist

**Event:** HackCanton League Season 3 (AppsFactory / Canton)  
**Freeze:** 8 Oct 2026 · **Submit:** 9 Oct 2026 23:59 UTC  
**Repo:** `cbtc-collateral-desk`  
**Primary track:** Financial Applications (bilateral lending / repay / liquidate)  
**Secondary (optional):** RWA & Business Workflows — only credit-approval + collateral-admin workflow if official criteria allow without an RWA narrative; otherwise skip.

Re-confirm every bounty amount and evidence format on the **official AppsFactory challenge cards** before click-submit:  
https://hackathon.appsfactory.cc/season-3 · https://appsfactory.cc/hackathons

---

## A. Pre-freeze (code)

- [ ] `./scripts/health-check.sh` exits **HEALTH CHECK OK**
- [ ] `./scripts/run-tests.sh` / `daml test` green
- [ ] `./scripts/run-demo.sh` (or `./scripts/run-full-demo.sh`) happy + liquidate green
- [ ] Optional: Path A sandbox demos green (`LOCALNET.md`, `MODE=ledger ./scripts/run-full-demo.sh`)
- [ ] No invented CIP-0112 package/interface/instrument hashes ([TOKEN_PIN.md](./TOKEN_PIN.md))
- [ ] No fake live DecMan / fake Grofty MainNet claims in README or video
- [ ] `.gitignore` covers `.daml/`, `*.dar`, `node_modules/`, `dist/`, `localnet/run/`, `localnet/logs/`
- [ ] Tag or archive freeze commit locally (no requirement to push from this checklist)

---

## B. Tracks

| Track | Claiming? | Evidence / notes |
| --- | --- | --- |
| **Financial Applications** (primary) | [ ] Yes | Bilateral propose/accept → lock CBTC → disburse USDCx → repay **or** liquidate; demo video + README |
| **RWA & Business Workflows** (optional) | [ ] Yes / [ ] No | Only if cards accept credit + custody workflow **without** T-bill/invoice RWA story |
| Other cards | [ ] N/A | Do not stretch scope into pool money-market UX |

One-liner for Financial card:

> Private bilateral CBTC collateral desk on Canton: credit-officer origination, Desk-controlled CBTC custody, lender-prefunded USDCx, repay with release or LiquidateFast — not a pooled money market.

---

## C. BitSafe — Decentralizing Apps

Theme = **Decentralized Party / DecMan** on the Desk party (not “we use CBTC”).

- [ ] Re-read [integrations/bitsafe/BITSAFE.md](./integrations/bitsafe/BITSAFE.md)
- [ ] Path chosen: **Gold** (DevNet/MainNet Decentralized Party, apply ~4 Oct / buffer ~2 Oct) **or** **Contribution** (LocalNet) — mutually exclusive until cards say otherwise
- [ ] `cd integrations/bitsafe && npm run prove:scaffold` documented as scaffold only (not Gold evidence)
- [ ] Printable three controls filled or honestly marked N/A: [integrations/bitsafe/DecManEvidence.md](./integrations/bitsafe/DecManEvidence.md)
- [ ] Screenshots / API dumps attached only for **real** DecMan (never scaffold-as-Gold)
- [ ] Daml `FUTURE(DecMan)` markers left fail-closed (`RequestGovernedCustodyRelease`)

**Do not submit** Gold evidence from IDE-ledger-only or `DECMAN_MODE=scaffold`.

---

## D. Grofty — Wallet / CIP-103

- [ ] [integrations/grofty/GROFTY.md](./integrations/grofty/GROFTY.md) followed
- [ ] Mock prove green: `cd integrations/grofty && npm run prove:mock`
- [ ] Role split stated: Grofty = borrower / lender / liquidator **only**; Desk/CreditOfficer never Grofty-authorized
- [ ] Live MainNet claimed **only if** whitelist + Party ID + Desk DAR on synchronizer + real Grant path recorded
- [ ] UI Grofty panel: Mock for offline video; Live only when extension + announce present ([ui/README.md](./ui/README.md))

---

## E. DAR / Daml package

- [ ] `daml build` → `.daml/dist/cbtc-collateral-desk-0.1.0.dar`
- [ ] Package name/version match `daml.yaml` (`cbtc-collateral-desk` / `0.1.0`, SDK **3.4.9**)
- [ ] DAR uploaded to any network you claim in the video (LocalNet Path A / DevNet / MainNet)
- [ ] Do **not** commit the DAR if policy is gitignore `*.dar` (rebuild from freeze tag)

---

## F. Demo video (< 5 min)

- [ ] Follow [scripts/demo-record.md](./scripts/demo-record.md)
- [ ] Happy path (repay) **and** liquidate path shown
- [ ] Narration: bilateral desk ≠ pool; fast vs gated liquidation honesty
- [ ] File named clearly (e.g. `cbtc-collateral-desk-demo.mp4`) and linked/uploaded per AppsFactory form
- [ ] No fake MainNet / DecMan Gold claims on camera

Commands:

```bash
./scripts/run-full-demo.sh                 # ide-ledger happy + liquidate
MODE=ledger ./scripts/run-full-demo.sh     # sandbox Ledger API
WITH_UI=1 ./scripts/run-full-demo.sh       # then record operator console
```

---

## G. README / docs freeze

- [ ] Root [README.md](./README.md) quick start, layout, production readiness, honesty blockers
- [ ] [PROJECT_PLAN.md](./PROJECT_PLAN.md) scope not widened past Financial MVP
- [ ] [LOCALNET.md](./LOCALNET.md) Path A verified notes accurate
- [ ] [TOKEN_PIN.md](./TOKEN_PIN.md) placeholders only unless real IDs filled
- [ ] Entry points listed: `scripts/health-check.sh`, `scripts/run-full-demo.sh`, `scripts/demo-record.md`, this checklist

---

## H. Submit day (9 Oct)

- [ ] Freeze commit hash recorded: _______________
- [ ] Health check re-run green: `./scripts/health-check.sh`
- [ ] Video final URL / file: _______________
- [ ] AppsFactory form fields filled (tracks, BitSafe path, Grofty claim level)
- [ ] BitSafe evidence pack attached **or** Contribution-only claim stated
- [ ] Submitted before **9 Oct 2026 23:59 UTC**
- [ ] Confirmation / receipt saved: _______________

---

## Quick commands (submit desk)

```bash
export PATH="$HOME/.daml/bin:$PATH"
cd ~/Projects/hackathons/current/cbtc-collateral-desk

./scripts/health-check.sh
./scripts/run-full-demo.sh
./scripts/run-tests.sh

# Optional LocalNet proof
./localnet/scripts/start-sandbox.sh          # other terminal
MODE=ledger ./scripts/run-full-demo.sh
```

**Honesty rule:** Prefer a smaller true claim (LocalNet + mock Grofty + DecMan scaffold) over a fake MainNet/Gold story.
