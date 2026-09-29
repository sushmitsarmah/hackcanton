type Props = {
  ready: boolean
  done: boolean
  busy: boolean
  collateralAmount: number | null
  onLock: () => Promise<void>
}

export function LockStep({
  ready,
  done,
  busy,
  collateralAmount,
  onLock,
}: Props) {
  return (
    <section className="panel step-panel">
      <h2>3. Lock collateral</h2>
      <p className="muted">
        Borrower CBTC → Desk vault via <code>AcceptedTerms.LockAndPrepare</code>.
        Mock Grofty grants <code>desk.lock-collateral</code> for BorrowerRole first.
        AcceptedTerms is archived (no double-lock).
      </p>
      <p>
        Required CBTC:{' '}
        <strong>{collateralAmount != null ? collateralAmount : '—'}</strong>
      </p>
      {done && <p className="ok">Collateral locked in Desk custody.</p>}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={!ready || done || busy}
          onClick={() => void onLock()}
        >
          {busy ? 'Locking…' : 'Lock CBTC + prepare disburse'}
        </button>
      </div>
    </section>
  )
}
