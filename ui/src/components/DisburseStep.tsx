type Props = {
  ready: boolean
  done: boolean
  busy: boolean
  principal: number | null
  onDisburse: () => Promise<void>
}

export function DisburseStep({
  ready,
  done,
  busy,
  principal,
  onDisburse,
}: Props) {
  return (
    <section className="panel step-panel">
      <h2>4. Disburse USDCx</h2>
      <p className="muted">
        Named lender funds the borrower via <code>ReadyToDisburse.Disburse</code>.
        Mock Grofty grants <code>desk.disburse</code> for LenderRole. No minting —
        lender must be prefunded (simulated here).
      </p>
      <p>
        Principal:{' '}
        <strong>{principal != null ? principal.toLocaleString() : '—'}</strong>{' '}
        USDCx
      </p>
      {done && <p className="ok">Loan active — USDCx disbursed.</p>}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={!ready || done || busy}
          onClick={() => void onDisburse()}
        >
          {busy ? 'Disbursing…' : 'Disburse principal'}
        </button>
      </div>
    </section>
  )
}
