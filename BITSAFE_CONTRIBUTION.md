# BitSafe — Contribution pool (LocalNet app integration)

**HackCanton S3 · BitSafe Decentralizing Apps**  
**Pool assumption (verify on official cards):** Contribution ~**20k CC** (LocalNet) · Gold ~30k (DevNet/MainNet Decentralized Party) · combined theme pool ~50k CC.

**User decision (working plan):** If BitSafe Gold / DecMan node access is **never approved**, we **will not** submit the Gold prize. We prepare and, if eligible, claim the **Contribution pool** instead.

Re-confirm amounts, evidence format, and exclusivity on the official AppsFactory BitSafe card before submit:  
https://hackathon.appsfactory.cc/season-3 · https://appsfactory.cc/hackathons

Companion docs: [LOCALNET.md](./LOCALNET.md) · [SUBMIT_CHECKLIST.md](./SUBMIT_CHECKLIST.md) · [integrations/bitsafe/BITSAFE.md](./integrations/bitsafe/BITSAFE.md) · [integrations/bitsafe/DecManEvidence.md](./integrations/bitsafe/DecManEvidence.md)

---

## Eligibility (read first)

| Rule | Action |
| --- | --- |
| **Gold applicants are ineligible for the Contribution pool** (until cards say otherwise) | Do **not** click-submit Contribution if you already applied / will submit Gold |
| Gold requires real DevNet/MainNet **Decentralized Party** via DecMan | If node / apply never approved → **skip Gold**; do not invent evidence |
| Contribution = LocalNet-visible app work | Submit **reproducible LocalNet integration** + **custom Daml modules** (this desk) |
| Prepare vs claim | **Always prepare** Contribution materials; **only claim** Contribution if **not** submitting Gold |

**Documented policy for this repo:**

1. Keep Contribution evidence (scripts, LocalNet Path A demo, docs) green through freeze.
2. Chase Gold only while a real DecMan path exists (~apply by 4 Oct / buffer ~2 Oct).
3. If Gold is abandoned (no approval / no node): claim **Contribution only** — never both.
4. Never submit scaffold / IDE-only stubs as Gold DecMan evidence.

---

## What we submit (Contribution)

Honest Contribution pack for this project:

1. **Custom Daml application modules** under `daml/Desk/` (credit origination, CBTC custody, bilateral loan, repay / LiquidateFast, token adapter + LocalNet `MockHolding`, demo + tests).
2. **Reproducible LocalNet app integration** — Canton sandbox **Path A** (real Ledger API `:6865`): build DAR → start sandbox → upload/allocate → happy + liquidate demos.
3. Optional **Path B** multi-participant bring-up proof (`proof-multi.sh`) — topology readiness, **not** a fake DecMan Gold claim.
4. Desk-side BitSafe wiring docs + scaffold hooks under `integrations/bitsafe/` — labeled **scaffold / FUTURE(DecMan)** only (not live DecMan).
5. Short demo video / recording checklist showing LocalNet (or ide-ledger + Path A mention) bilateral flow — **no Gold / live DecMan narration**.

**Out of Contribution claim (do not assert):**

- Live DecMan Gold topology dumps or “we are a Decentralized Party on DevNet/MainNet”
- Fake `DECMAN_MODE=http` against a stub
- Grofty live MainNet without whitelist (separate bounty; mock is fine for Contribution video)

---

## Exact one-shot commands

From repo root `~/Projects/hackathons/current/cbtc-collateral-desk`:

```bash
export PATH="$HOME/.daml/bin:$PATH"
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"

cd ~/Projects/hackathons/current/cbtc-collateral-desk
```

### Path A — primary Contribution proof (recommended)

**Terminal 1 — sandbox (keep open):**

```bash
./localnet/scripts/start-sandbox.sh
# Wait for: Canton sandbox is ready. (Ledger :6865, JSON :7575)
```

**Terminal 2 — health + full Ledger demo (or use the wrapper):**

```bash
# One-shot wrapper (preferred):
./scripts/contrib-demo.sh

# Equivalent manual Path A:
./scripts/health-check.sh
MODE=ledger RESET_BETWEEN=1 ./scripts/run-full-demo.sh
```

`contrib-demo.sh` defaults: health-check → start sandbox if needed → `MODE=ledger` full demo → print **CONTRIB_DEMO_PASS** / **CONTRIB_DEMO_FAIL**.  
Skip auto-start with `SKIP_SANDBOX_START=1` if Terminal 1 already runs the sandbox.

Details: [LOCALNET.md](./LOCALNET.md) (Path A verified notes).

### Path B — optional multi-participant proof

Does **not** replace Path A Desk.Demo; proves two Ledger APIs + party lists only.

```bash
BACKGROUND=1 ./localnet/scripts/start-multi.sh
./localnet/scripts/proof-multi.sh
# Expect: PATH_B_PROOF_OK

# Or via wrapper:
WITH_PATH_B=1 ./scripts/contrib-demo.sh
```

### Offline / no sandbox (prep only — weaker Contribution evidence)

```bash
./scripts/health-check.sh
./scripts/run-full-demo.sh                 # ide-ledger happy + liquidate
cd integrations/bitsafe && npm run prove:scaffold   # scaffold only — not Gold
```

Prefer Path A Ledger API for the claim you attach to AppsFactory.

---

## Video / checklist (Contribution)

Use [scripts/demo-record.md](./scripts/demo-record.md) and [SUBMIT_CHECKLIST.md](./SUBMIT_CHECKLIST.md) §F, with these Contribution-specific checks:

- [ ] Narrate: **bilateral CBTC collateral desk** on Canton LocalNet — custom Daml modules + Ledger API demo
- [ ] Show happy path **and** liquidate path (`run-full-demo` / Path A)
- [ ] State clearly: **Contribution pool / LocalNet** — **not** BitSafe Gold DecMan
- [ ] Do **not** claim live Decentralized Party, DevNet/MainNet DecMan, or Gold evidence
- [ ] Optional: mention Path B multi-participant bring-up if you ran `proof-multi.sh`
- [ ] Point reviewers at this file + `LOCALNET.md` + `integrations/bitsafe/`
- [ ] On AppsFactory form: claim **Contribution only** if Gold was never submitted / never applied (per card exclusivity)

Freeze-day one-liner for the form:

> Contribution: reproducible Canton LocalNet (Path A Ledger API) integration of custom Desk Daml (bilateral CBTC collateral / USDCx disburse / repay or liquidate). DecMan hooks remain scaffold/FUTURE — not claiming Gold.

---

## Honesty (no fake DecMan)

| Allowed | Forbidden |
| --- | --- |
| LocalNet Path A/B proofs, ide-ledger demos, `daml test` | Fabricating DecMan screenshots or topology dumps |
| `DECMAN_MODE=scaffold` / `npm run prove:scaffold` as **wiring docs** | Submitting scaffold output as Gold evidence |
| `FUTURE(DecMan)` fail-closed markers in Daml | Claiming Desk is already a Decentralized Party |
| True Contribution-only claim when Gold abandoned | Claiming Gold **and** Contribution if cards mark them exclusive |

Full Gold vs Contribution decision tree: [integrations/bitsafe/BITSAFE.md](./integrations/bitsafe/BITSAFE.md).

---

## Links (pack index)

| Doc / path | Role |
| --- | --- |
| [LOCALNET.md](./LOCALNET.md) | Path A / B / C commands and honest limits |
| [SUBMIT_CHECKLIST.md](./SUBMIT_CHECKLIST.md) | Freeze/submit; **Contribution pool** section |
| [README.md](./README.md) | Quick start + Contribution entry |
| [integrations/bitsafe/BITSAFE.md](./integrations/bitsafe/BITSAFE.md) | Gold apply path + DecMan controls |
| [integrations/bitsafe/DecManEvidence.md](./integrations/bitsafe/DecManEvidence.md) | Three-control printable checklist (Gold only when real) |
| [scripts/contrib-demo.sh](./scripts/contrib-demo.sh) | One-shot Contribution LocalNet demo |
| [scripts/health-check.sh](./scripts/health-check.sh) | Pre-submit health |
| [scripts/run-full-demo.sh](./scripts/run-full-demo.sh) | Happy + liquidate |
| [localnet/scripts/proof-multi.sh](./localnet/scripts/proof-multi.sh) | Optional Path B proof |
