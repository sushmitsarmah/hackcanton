import type { DeskPhase, FlowStepId } from '../types.ts'
import { FLOW_STEPS } from '../types.ts'

function stepStatus(
  id: FlowStepId,
  phase: DeskPhase,
): 'done' | 'active' | 'todo' | 'alt' {
  const order: DeskPhase[] = [
    'idle',
    'proposed',
    'lender_accepted',
    'accepted',
    'locked',
    'disbursed',
    'repaid',
    'liquidated',
  ]
  const pi = order.indexOf(phase)

  switch (id) {
    case 'propose':
      return pi >= 1 ? 'done' : 'active'
    case 'accept':
      if (pi >= 3) return 'done'
      if (pi >= 1) return 'active'
      return 'todo'
    case 'lock':
      if (pi >= 4) return 'done'
      if (pi === 3) return 'active'
      return 'todo'
    case 'disburse':
      if (pi >= 5) return 'done'
      if (pi === 4) return 'active'
      return 'todo'
    case 'repay':
      if (phase === 'repaid') return 'done'
      if (phase === 'liquidated') return 'alt'
      if (phase === 'disbursed') return 'active'
      return 'todo'
    case 'liquidate':
      if (phase === 'liquidated') return 'done'
      if (phase === 'repaid') return 'alt'
      if (phase === 'disbursed') return 'active'
      return 'todo'
  }
}

type Props = {
  phase: DeskPhase
  current: FlowStepId
  onSelect: (id: FlowStepId) => void
}

export function StepNav({ phase, current, onSelect }: Props) {
  return (
    <nav className="progress" aria-label="Loan workflow steps">
      {FLOW_STEPS.map((s, i) => {
        const st = stepStatus(s.id, phase)
        const label = s.short.replace(/^\d+\.\s*/, '')
        return (
          <span key={s.id} style={{ display: 'contents' }}>
            {i > 0 && <i aria-hidden />}
            <button
              type="button"
              className={`stage ${st} ${current === s.id ? 'current' : ''}`}
              onClick={() => onSelect(s.id)}
            >
              {i + 1} <span className="dot" aria-hidden /> {label}
            </button>
          </span>
        )
      })}
    </nav>
  )
}
