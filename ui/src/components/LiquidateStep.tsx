import { useState } from 'react'

type Props = {
  ready: boolean
  done: boolean
  closedOther: boolean
  busy: boolean
  markPrice: number | null
  onStress: (price: number) => void
  onLiquidate: () => Promise<void>
}

export function LiquidateStep({
  ready,
  done,
  closedOther,
  busy,
  markPrice,
  onStress,
  onLiquidate,
}: Props) {
  const [stress, setStress] = useState(40_000)

  return (
    <section className="panel step-panel">
      <h2>6. Liquidate (default path)</h2>
      <p className="muted">
        Liquidation only when HF &lt; 1 (or maturity — not simulated). Drop the
        desk mark price to breach HF, then liquidator exercises{' '}
        <code>Loan.Liquidate</code> → <code>SeizeToLiquidator</code>. Auth:{' '}
        <code>desk.liquidate</code> / LiquidatorRole.
      </p>
      <p>
        Current mark:{' '}
        <strong>{markPrice != null ? markPrice.toLocaleString() : '—'}</strong>{' '}
        USDCx/CBTC
      </p>
      <div className="form-inline">
        <label>
          Stress mark price
          <input
            type="number"
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            disabled={!ready || done || closedOther || busy}
          />
        </label>
        <button
          type="button"
          disabled={!ready || done || closedOther || busy}
          onClick={() => onStress(stress)}
        >
          Apply stress mark
        </button>
      </div>
      {done && (
        <p className="ok">Liquidated — CBTC seized to designated liquidator.</p>
      )}
      {closedOther && <p className="warn">Loan already closed via repay.</p>}
      <div className="actions">
        <button
          type="button"
          className="danger"
          disabled={!ready || done || closedOther || busy}
          onClick={() => void onLiquidate()}
        >
          {busy ? 'Liquidating…' : 'Liquidate + seize CBTC'}
        </button>
      </div>
    </section>
  )
}
