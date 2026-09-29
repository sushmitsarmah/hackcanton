# DecMan evidence checklist — CBTC Collateral Desk

Print or attach screenshots / API dumps when submitting AppsFactory BitSafe **Decentralizing Apps**.  
Date evidence captured: _______________  Network: LocalNet / DevNet / MainNet (circle one)

**Rule:** Do not submit Gold evidence from IDE-ledger-only or scaffold mode.

## Access / environment

- [ ] Approved DecMan release tag / image: _______________
- [ ] DecMan UI / API base URL: _______________
- [ ] Peer count (≥2): _______________
- [ ] Desk Decentralized Party id: _______________
- [ ] Identity provider path (Keycloak / Auth0 / insecure-local only): _______________
- [ ] Canton Admin + Ledger APIs reachable from each peer

## Control 1 — Topology ownership

- [ ] Decentralized namespace owners listed (threshold policy noted)
- [ ] PartyToParticipant hosts listed with permissions
- [ ] Topology serial / proposal id recorded
- [ ] Propagation verified on **every** hosting participant (not just submit ACK)
- [ ] Linked Daml FUTURE markers: `CollateralCustody`, `MockToken`, `Demo`, `Auth`

Artifacts: topology dump / UI screenshots / Admin API responses → attach: _______________

## Control 2 — Transaction confirmation / hosting threshold

For each action below, record confirmation id → execute id (or N/A + reason):

| Desk action | Confirmation id | Execute / settle id | Bypass rejected? |
|-------------|-----------------|---------------------|------------------|
| Lock CBTC into Desk vault | | | ☐ |
| ReleaseToBorrower (repay exit) | | | ☐ |
| SeizeToLiquidator (fast path only — via LiquidateFast) | N/A (pre-authorized) | | ☐ |
| RequestGovernedCustodyRelease (gated) | | | ☐ |
| Disburse USDCx | | | ☐ |
| Liquidate settlement (gated path — not LiquidateFast) | | | ☐ |

- [ ] Fast path documented: pre-authorized liquidator (no threshold delay on emergency seize)
- [ ] Outage drill notes: participant / DecMan coordinator / app backend
- [ ] Linked Daml FUTURE markers: `Loan`, `CollateralCustody`, `Auth`

## Control 3 — App governance

- [ ] Example governed change (product params **or** party onboarding)
- [ ] Threshold (e.g. 2-of-3) and confirming operators named
- [ ] Propose → confirm → execute (or cancel/expire) trail captured
- [ ] Linked Daml FUTURE markers: `CreditApplication`, `Auth`

## Path claimed

- [ ] **Gold** (DevNet/MainNet Decentralized Party) — apply by ~4 Oct (buffer ~2 Oct)
- [ ] **Contribution** (LocalNet / contribution PR) — Gold path not used

## Honesty statement

Scaffold / `DECMAN_MODE=scaffold` output alone is **not** evidence.  
Signer: _______________  Date (Asia/Calcutta): _______________
