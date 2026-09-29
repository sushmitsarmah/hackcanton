type Props = {
  ready: boolean
  done: boolean
  closedOther: boolean
  busy: boolean
  debt: number | null
  onRepay: () => Promise<void>
}

export function RepayStep({
  ready,
  done,
  closedOther,
  busy,
  debt,
  onRepay,
}: Props) {
  return (
    <section className="panel step-panel">
      <h2>5. Repay (happy path)</h2>
      <p className="muted">
        Full repay → <code>Loan.Repay</code> then custody{' '}
        <code>ReleaseToBorrower</code>. Auth purpose <code>desk.repay</code>{' '}
        (BorrowerRole). Mutually exclusive with liquidate for this demo loan.
      </p>
      <p>
        Outstanding debt:{' '}
        <strong>{debt != null ? debt.toLocaleString() : '—'}</strong> USDCx
      </p>
      {done && <p className="ok">Fully repaid — collateral released to borrower.</p>}
      {closedOther && (
        <p className="warn">Loan already closed via liquidation.</p>
      )}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={!ready || done || closedOther || busy}
          onClick={() => void onRepay()}
        >
          {busy ? 'Repaying…' : 'Full repay + release CBTC'}
        </button>
      </div>
    </section>
  )
}
