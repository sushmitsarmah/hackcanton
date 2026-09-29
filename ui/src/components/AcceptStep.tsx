import type { DeskPhase } from '../types.ts'

type Props = {
  phase: DeskPhase
  busy: boolean
  onLenderAccept: () => Promise<void>
  onBorrowerAccept: () => Promise<void>
}

export function AcceptStep({
  phase,
  busy,
  onLenderAccept,
  onBorrowerAccept,
}: Props) {
  return (
    <section className="panel step-panel">
      <h2>2. Accept status</h2>
      <p className="muted">
        Lender then borrower accept → <code>AcceptedTerms</code>. In production
        each party signs on their participant; here we simulate both clicks.
      </p>
      <ol className="accept-track">
        <li className={phase !== 'idle' ? 'done' : ''}>
          CreditOfficer proposed
          <span>{phase === 'idle' ? 'waiting' : '✓'}</span>
        </li>
        <li
          className={
            phase === 'lender_accepted' ||
            phase === 'accepted' ||
            [
              'locked',
              'disbursed',
              'repaid',
              'liquidated',
            ].includes(phase)
              ? 'done'
              : ''
          }
        >
          Lender accepted
          <span>
            {['lender_accepted', 'accepted', 'locked', 'disbursed', 'repaid', 'liquidated'].includes(
              phase,
            )
              ? '✓'
              : 'pending'}
          </span>
        </li>
        <li
          className={
            ['accepted', 'locked', 'disbursed', 'repaid', 'liquidated'].includes(
              phase,
            )
              ? 'done'
              : ''
          }
        >
          Borrower accepted → AcceptedTerms
          <span>
            {['accepted', 'locked', 'disbursed', 'repaid', 'liquidated'].includes(
              phase,
            )
              ? '✓'
              : 'pending'}
          </span>
        </li>
      </ol>
      <div className="actions">
        <button
          type="button"
          disabled={busy || phase !== 'proposed'}
          onClick={() => void onLenderAccept()}
        >
          Lender accept
        </button>
        <button
          type="button"
          className="primary"
          disabled={busy || phase !== 'lender_accepted'}
          onClick={() => void onBorrowerAccept()}
        >
          Borrower accept
        </button>
      </div>
    </section>
  )
}
