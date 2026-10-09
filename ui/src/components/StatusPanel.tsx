import type { DeskParties, DeskPosition } from '../types.ts'
import { positionSummary } from '../lib/deskApi.ts'
import { fmtNum, fmtPct } from '../lib/hf.ts'

type Props = {
  position: DeskPosition
  parties: DeskParties
}

function shortParty(p: string): string {
  return p.split('::')[0] ?? p
}

export function StatusPanel({ position, parties }: Props) {
  const s = positionSummary(position)
  return (
    <section className="panel status-panel">
      <div className="panel-title">
        <h2>Position &amp; Controls</h2>
        <span className="pill green">♢ Desk custody</span>
      </div>

      <div className="control">
        <b>♢</b>
        <div>
          <strong>Collateral Custody</strong>
          <p>
            {fmtNum(position.lockedCbtc, 4)} CBTC
            <br />
            <span>
              {position.phase === 'idle' ? 'Not locked' : 'In custody · Not transferable'}
            </span>
          </p>
        </div>
      </div>

      <div className="control">
        <b>♙</b>
        <div>
          <strong>
            Authorization <small>(Grofty)</small>
          </strong>
          <p>
            {position.grants.length} grant{position.grants.length === 1 ? '' : 's'}
            <br />
            <span>Desk / CreditOfficer never Grofty-authorized</span>
          </p>
        </div>
      </div>

      <div className="control">
        <b>◉</b>
        <div>
          <strong>Health</strong>
          <p>
            HF {s.hf != null ? s.hf.toFixed(3) : '—'} · LTV{' '}
            {s.ltv != null ? fmtPct(s.ltv) : '—'}
            <br />
            <span>
              Mark {position.markPrice != null ? fmtNum(position.markPrice) : '—'} ·
              Debt {s.debt != null ? fmtNum(s.debt) : '—'}
            </span>
          </p>
        </div>
      </div>

      <dl className="kv" style={{ marginTop: '0.75rem' }}>
        <dt>Phase</dt>
        <dd>
          <code className={`phase phase-${position.phase}`}>{position.phase}</code>
        </dd>
        <dt>Proposal</dt>
        <dd className="mono">{position.proposalId ?? '—'}</dd>
        <dt>AcceptedTerms</dt>
        <dd className="mono">{position.acceptedTermsId ?? '—'}</dd>
        <dt>Vault / Loan</dt>
        <dd className="mono">
          {position.vaultClaimId ?? '—'} / {position.loanId ?? '—'}
        </dd>
      </dl>

      {position.lastError && (
        <p className="error-banner" role="alert">
          {position.lastError}
        </p>
      )}

      <h3 className="subhead">Parties</h3>
      <ul className="party-list">
        <li>
          <strong>Desk</strong> {shortParty(parties.creditOfficer)}
          <span className="tag">no Grofty</span>
        </li>
        <li>
          <strong>Lender</strong> {shortParty(parties.lender)}
        </li>
        <li>
          <strong>Borrower</strong> {shortParty(parties.borrower)}
        </li>
        <li>
          <strong>Liquidator</strong> {shortParty(parties.liquidator)}
        </li>
      </ul>
    </section>
  )
}
