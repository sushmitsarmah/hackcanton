import type { DeskParties, DeskPosition } from '../types.ts'
import { positionSummary } from '../lib/deskApi.ts'
import { fmtNum, fmtPct } from '../lib/hf.ts'

type Props = {
  position: DeskPosition
  parties: DeskParties
}

function shortParty(p: string): string {
  const head = p.split('::')[0] ?? p
  return head
}

export function StatusPanel({ position, parties }: Props) {
  const s = positionSummary(position)
  return (
    <section className="panel status-panel">
      <h2>Position</h2>
      <dl className="kv">
        <dt>Phase</dt>
        <dd>
          <code className={`phase phase-${position.phase}`}>
            {position.phase}
          </code>
        </dd>
        <dt>Proposal</dt>
        <dd className="mono">{position.proposalId ?? '—'}</dd>
        <dt>AcceptedTerms</dt>
        <dd className="mono">{position.acceptedTermsId ?? '—'}</dd>
        <dt>Vault / Loan</dt>
        <dd className="mono">
          {position.vaultClaimId ?? '—'} / {position.loanId ?? '—'}
        </dd>
        <dt>Locked CBTC</dt>
        <dd>{fmtNum(position.lockedCbtc, 4)}</dd>
        <dt>Mark price</dt>
        <dd>
          {position.markPrice != null ? fmtNum(position.markPrice) : '—'} USDCx
        </dd>
        <dt>Debt</dt>
        <dd>{s.debt != null ? `${fmtNum(s.debt)} USDCx` : '—'}</dd>
        <dt>HF / LTV</dt>
        <dd>
          {s.hf != null ? s.hf.toFixed(3) : '—'} /{' '}
          {s.ltv != null ? fmtPct(s.ltv) : '—'}
        </dd>
        <dt>Auth grants</dt>
        <dd>{position.grants.length}</dd>
      </dl>
      {position.lastError && (
        <p className="error-banner" role="alert">
          {position.lastError}
        </p>
      )}
      <h3>Parties (mock)</h3>
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
