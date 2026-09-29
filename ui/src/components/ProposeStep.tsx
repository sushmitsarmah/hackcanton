import { useState, type ChangeEvent } from 'react'
import type { LoanTermsForm } from '../types.ts'
import { DEFAULT_TERMS } from '../types.ts'
import { fmtPct, validateTerms } from '../lib/hf.ts'

type Props = {
  disabled: boolean
  busy: boolean
  initial?: LoanTermsForm | null
  onPropose: (terms: LoanTermsForm) => Promise<void>
}

export function ProposeStep({ disabled, busy, initial, onPropose }: Props) {
  const [form, setForm] = useState<LoanTermsForm>(initial ?? DEFAULT_TERMS)
  const validation = validateTerms(form)

  const set =
    (key: keyof LoanTermsForm) => (e: ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value)
      setForm((f) => ({ ...f, [key]: v }))
    }

  return (
    <section className="panel step-panel">
      <h2>1. Propose loan terms</h2>
      <p className="muted">
        CreditOfficer creates a bilateral <code>LoanProposal</code> (Desk signer —
        not Grofty-authorized). Defaults match <code>Desk.Demo</code> happy path.
      </p>
      <div className="form-grid">
        <label>
          Principal (USDCx)
          <input
            type="number"
            value={form.principal}
            onChange={set('principal')}
            disabled={disabled || busy}
          />
        </label>
        <label>
          Interest rate (annual)
          <input
            type="number"
            step="0.01"
            value={form.interestRate}
            onChange={set('interestRate')}
            disabled={disabled || busy}
          />
          <span className="hint">{fmtPct(form.interestRate)}</span>
        </label>
        <label>
          Collateral (CBTC)
          <input
            type="number"
            step="0.01"
            value={form.collateralAmount}
            onChange={set('collateralAmount')}
            disabled={disabled || busy}
          />
        </label>
        <label>
          Collateral price (USDCx/CBTC)
          <input
            type="number"
            value={form.collateralPrice}
            onChange={set('collateralPrice')}
            disabled={disabled || busy}
          />
        </label>
        <label>
          Max LTV
          <input
            type="number"
            step="0.01"
            value={form.maxLtv}
            onChange={set('maxLtv')}
            disabled={disabled || busy}
          />
        </label>
        <label>
          Liquidation threshold
          <input
            type="number"
            step="0.01"
            value={form.liquidationThreshold}
            onChange={set('liquidationThreshold')}
            disabled={disabled || busy}
          />
        </label>
        <label>
          Maturity (days)
          <input
            type="number"
            value={form.maturityDays}
            onChange={set('maturityDays')}
            disabled={disabled || busy}
          />
        </label>
      </div>
      {validation && <p className="warn">{validation}</p>}
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={disabled || busy || !!validation}
          onClick={() => void onPropose(form)}
        >
          {busy ? 'Submitting…' : 'Propose terms'}
        </button>
      </div>
    </section>
  )
}
