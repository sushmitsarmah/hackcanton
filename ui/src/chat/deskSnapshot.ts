import { positionSummary } from '../lib/deskApi.ts'
import type { DeskPosition, FlowStepId } from '../types.ts'

/** Mirror of worker/ai/tools/types.ts DeskSnapshot. */
export interface DeskSnapshot {
  phase: string
  step: string
  terms: {
    principal: number
    interestRate: number
    collateralAmount: number
    collateralPrice: number
    liquidationThreshold: number
    maxLtv: number
    maturityDays: number
  } | null
  lockedCbtc: number
  debt: number | null
  markPrice: number | null
  healthFactor: number | null
  ltv: number | null
  grants: number
  lastError: string | null
}

/** Build the snapshot the assistant sees for a turn. */
export function toDeskSnapshot(position: DeskPosition, step: FlowStepId): DeskSnapshot {
  const s = positionSummary(position)
  return {
    phase: position.phase,
    step,
    terms: position.terms,
    lockedCbtc: position.lockedCbtc,
    debt: s.debt,
    markPrice: position.markPrice,
    healthFactor: s.hf,
    ltv: s.ltv,
    grants: position.grants.length,
    lastError: position.lastError,
  }
}
