# Demo runbook — collat.trade / CBTC Collateral Desk

Every command, in order, to produce the demo recording. Target: one clean
< 5 minute video. Do the preparation (0) before you hit Record.

Product: **collat.trade** (hosted https://collat.trade). Repo: `cbtc-collateral-desk`.

---

## 0. One-time setup (do once, before recording)

Open two terminals. Terminal A is the ledger; Terminal B is the console.

### Terminal A — environment + start the ledger

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$HOME/.daml/bin:$PATH"
cd /path/to/cbtc-collateral-desk

java -version          # must print 21.x (NOT 25)
daml build             # → .daml/dist/cbtc-collateral-desk-0.1.0.dar

# Start Path A sandbox (background; wait for READY)
BACKGROUND=1 ./localnet/scripts/start-sandbox.sh
```

Wait until it prints `READY (Ledger API localhost:6865)`.

Verify (optional):

```bash
./localnet/scripts/status.sh          # shows port 6865 LISTEN, pid RUNNING
curl -s http://localhost:7575/v2/state/ledger-end   # {"offset":N}
```

### Terminal B — the operator console

```bash
cd /path/to/cbtc-collateral-desk/ui
npm install            # first time only
npm run dev            # → http://localhost:5173
```

Open **http://localhost:5173/#/desk** in your browser. The badge in the header
must read **`Ledger: live (/v2)`**. If it says `Ledger: mock`, the sandbox isn't
reachable — recheck Terminal A.

---

## 1. Sanity checks (before Record)

```bash
# Terminal A
./scripts/run-tests.sh                 # daml test — all green
SKIP_HEALTH=1 ./scripts/contrib-demo.sh   # ends with CONTRIB_DEMO_PASS
```

`contrib-demo.sh` restarts the sandbox and runs happy + liquidate on the real
Ledger API. After it finishes, restart the sandbox once more so the console
starts from a clean ledger:

```bash
./localnet/scripts/stop-sandbox.sh
BACKGROUND=1 ./localnet/scripts/start-sandbox.sh
```

Confirm http://localhost:5173/#/desk shows **`Ledger: live (/v2)`** again.

---

## 2. Start recording

Set your screen recorder to capture the browser + Terminal A. Have ready:

- Tab 1: **http://localhost:5173/#/desk** (the console — main visual)
- Tab 2: **https://collat.trade/#/desk** (hosted; for the AI assistant)
- Terminal A (the ledger) visible for the `contrib-demo` run

---

## 3. The demo (record in this order)

### A. Title + console (~10 s)
- Show the console. Say: *"collat.trade — a private bilateral CBTC credit desk on Canton. Not a pooled money market."*
- Point at the **Ledger: live (/v2)** badge: *"every button here submits a real Canton transaction."*

### B. Happy path — ledger-backed (~90 s)
On http://localhost:5173/#/desk, click in order (each step waits ~5–10 s):

1. **Propose terms** (defaults OK).
2. Stage **Accept** → **Lender accept** → **Borrower accept**.
3. Stage **Lock** → **Lock CBTC + prepare disburse**.
4. Stage **Disburse** → **Disburse principal**.
5. Stage **Repay** → **Full repay + release CBTC**.

Narrate each: bilateral proposal → both parties accept → CBTC into Desk custody
→ lender's prefunded USDCx disbursed → full repay releases the collateral.
Watch the **Event log** and the **Position & Controls** panel update from real
ledger state.

### C. Liquidation path — ledger-backed (~60 s)
- **Reset demo** (top right).
- Repeat B steps 1–4 (propose → accept → lock → disburse).
- Stage **Liquidate** → set the stress mark (e.g. `40000`) → **Apply stress mark**
  → HF drops below 1 → **Liquidate + seize CBTC**.
- Narrate: *"fast path — a pre-authorized liquidator seizes on an HF breach; no
  DecMan threshold wait. The gated path is fail-closed until DecMan is live."*

### D. AI desk assistant (~45 s)
Switch to **https://collat.trade/#/desk**, open the **✦** launcher (bottom right):

1. *"What is the desk state?"* → it calls `get_desk_state` and answers.
2. *"Explain the current health factor."*
3. *"Propose a 100,000 USDCx loan against 2 CBTC."* → show the **confirmation
   card** and that nothing runs until you click confirm.
4. Open the header **provider · model** dropdown; switch model to show it changes.

Narrate: the assistant only **proposes**; the operator confirms.

### E. Grofty proof (~30 s, optional)
On https://collat.trade/#/desk → Grofty panel → **Live** → **Probe** → **Connect**.
Show the real wallet party. (You may demonstrate the wallet signing
`AuthorizationGranted`.) Say honestly: *"the wallet signs on Canton; a live loan
additionally needs the Desk DAR vetted on the wallet's participant."*

### F. Closing (~20 s)
- Show Terminal A: `CONTRIB_DEMO_PASS`.
- Point at README honesty table: CIP-0112 pins, Grofty participant upload,
  DecMan Gold — none faked.
- Stop recording.

---

## 4. Teardown (after recording)

```bash
# Terminal A
./localnet/scripts/stop-sandbox.sh
```

---

## Cheat sheet

| Action | Command / URL |
| --- | --- |
| Build DAR | `daml build` |
| Start ledger | `BACKGROUND=1 ./localnet/scripts/start-sandbox.sh` |
| Ledger status | `./localnet/scripts/status.sh` |
| Stop ledger | `./localnet/scripts/stop-sandbox.sh` |
| Console (dev) | `cd ui && npm run dev` → http://localhost:5173/#/desk |
| Hosted console | https://collat.trade/#/desk |
| Tests | `./scripts/run-tests.sh` |
| Contribution proof | `SKIP_HEALTH=1 ./scripts/contrib-demo.sh` |
| Happy + liquidate (terminal) | `MODE=ledger RESET_BETWEEN=1 ./scripts/run-full-demo.sh` |

---

## Do NOT do / claim

- Do not call the pooled money-market UX, "minting USDCx", or "CBTC as an RWA".
- Do not claim a live Grofty loan or live DecMan Gold without the DAR vetted.
- Do not invent CIP-0112 package/instrument hashes.
- The AI assistant never signs or submits — always show the confirm step.
