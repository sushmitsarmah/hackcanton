# CIP-0112 Token Pin Checklist

**Purpose:** Fill real CBTC / USDCx package, interface, and instrument IDs before any DevNet or MainNet claim. Until then, Desk runs on **LocalNet `MockHolding`** behind `Desk.TokenAdapter` / `HoldingCid`.

**Do not invent MainNet package hashes.** Leave `PLACEHOLDER` values until you copy IDs from the official registry / CIP-0112 pin docs for the chosen network.

Related code:

| File | Role |
|------|------|
| `daml/Desk/TokenPin.daml` | `AssetPin` / `TokenPinSet` placeholders (LocalNet / DevNet / MainNet) |
| `daml/Desk/TokenAdapter.daml` | HoldingView + Transferable; documents Transfer / GetView expectations |
| `daml/Desk/MockToken.daml` | LocalNet default (`DeskHolding` / `HoldingCid` = `MockHolding`) |
| `daml/Desk/Loan.daml` / `CollateralCustody.daml` | Use `HoldingCid` only — no raw network package IDs |

---

## Adapter expectations (what loan/custody assume)

| Operation | LocalNet (`MockHolding`) | CIP-0112 target (when pinned) |
|-----------|--------------------------|-------------------------------|
| **GetView** | `MockHolding.GetView` → `HoldingView` | HoldingV2 interface `GetView` / `view @Holding` |
| **Transfer** | Bilateral `Transfer` (owner + newOwner) | TransferInstructionV2 factory + accept (network-specific) |
| **Split / Merge** | Fungible choices on `MockHolding` | Fungible holding interface choices where available |
| **Identity** | `AssetTag` + pin placeholders on view | `InstrumentId { admin, id }` + package id from pin set |

Swap without rewriting loan/custody:

1. Fill pins below and set `activeTokenPins` in `Desk.TokenPin` to DevNet or MainNet.
2. Add the pinned DAR dependency in `daml.yaml`.
3. Implement `Transferable` for the real Holding (or map helpers in `MockToken.daml`: `transferHolding`, `getHoldingViewCmd`).
4. Change `type DeskHolding = …` / `HoldingCid` in `MockToken.daml` to the real template.
5. Keep `Loan` / `CollateralCustody` on `HoldingCid` + `Transfer` / `GetView` / `Split` / `Merge` names (adapter helpers if names differ).

---

## Checklist — LocalNet (current default)

- [x] `activeTokenPins = localNetPins`
- [x] `MockHolding` implements `Transferable` with `GetView` / `Transfer` / `Split` / `Merge`
- [x] Loan / custody use `HoldingCid` (not hard-coded MainNet IDs)
- [x] Placeholders still contain the substring `PLACEHOLDER` (`allPinsStillPlaceholder`)
- [ ] (Optional) Point UI diagnostics at `adapterPins` / `GetView` for demo screenshots

---

## Checklist — DevNet

Copy values from the official CBTC / USDCx / Canton Token Standard docs for **DevNet** only.

- [ ] Confirm network name / synchronizer id: ________________
- [ ] CBTC package id → `devNetPins.cbtc.packageId`
- [ ] CBTC Holding interface id → `devNetPins.cbtc.holdingInterfaceId`
- [ ] CBTC Transfer / Transferable / TransferInstruction id → `devNetPins.cbtc.transferableInterfaceId`
- [ ] CBTC instrument id → `devNetPins.cbtc.instrumentId`
- [ ] CBTC instrument admin / registry party hint → `devNetPins.cbtc.instrumentAdminHint`
- [ ] USDCx package id → `devNetPins.usdcx.packageId`
- [ ] USDCx Holding interface id → `devNetPins.usdcx.holdingInterfaceId`
- [ ] USDCx Transfer surface id → `devNetPins.usdcx.transferableInterfaceId`
- [ ] USDCx instrument id → `devNetPins.usdcx.instrumentId`
- [ ] USDCx instrument admin hint → `devNetPins.usdcx.instrumentAdminHint`
- [ ] DAR dependency added to `daml.yaml` and builds
- [ ] `activeTokenPins = devNetPins` (only after IDs above are real, not PLACEHOLDER)
- [ ] Smoke: mint/fetch GetView for CBTC + USDCx on DevNet
- [ ] Smoke: one lock → disburse path using real holdings (no MockHolding mint)

---

## Checklist — MainNet

Same fields as DevNet; **separate** pin set. Do not reuse DevNet IDs.

- [ ] Confirm MainNet synchronizer / registry docs URL: ________________
- [ ] CBTC package / Holding / Transfer / instrument / admin → `mainNetPins.cbtc.*`
- [ ] USDCx package / Holding / Transfer / instrument / admin → `mainNetPins.usdcx.*`
- [ ] DAR on MainNet synchronizer (upload evidence linked here): ________________
- [ ] Desk custody party registered as CBTC holder (topology / DecMan as required)
- [ ] `activeTokenPins = mainNetPins` only after every MainNet field is non-PLACEHOLDER
- [ ] README “CIP-0112 MainNet pin” row flipped from blocked → pinned (date + links)
- [ ] No remaining `PLACEHOLDER` in `mainNetPins` packageId / instrumentId

---

## Explicit non-goals

- Do **not** paste guessed 64-hex package ids to look MainNet-ready.
- Do **not** treat CIP-0056 allocations as durable collateral locks (PROJECT_PLAN §5.2).
- Do **not** mint USDCx on disbursement — always transfer from the named lender holding.

---

*Last updated with Point 4 (CIP-0112 token adapter layer). Update this file when a real pin lands.*
