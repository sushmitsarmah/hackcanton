import type { JsonSchema } from '../types.ts'

/** A side-effect-free summary shown in the confirmation card before a write runs. */
export interface ToolPreview {
  action: string
  fields: { label: string; value: string }[]
  note?: string
}

export type ToolKind = 'read' | 'navigate' | 'propose'

export interface AgentToolContext {
  /** The desk snapshot the client sent with the turn. */
  desk: DeskSnapshot
}

/** The client-side desk state, mirrored from ui/src/types.ts DeskPosition. */
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

export interface AgentTool {
  name: string
  kind: ToolKind
  description: string
  parameters: JsonSchema
  /** Read/navigate tools run immediately and return text. */
  run?: (args: Record<string, unknown>, ctx: AgentToolContext) => Promise<{ text: string; route?: string }>
  /** Propose tools return what they *would* do; the client confirms then executes. */
  preview?: (args: Record<string, unknown>, ctx: AgentToolContext) => ToolPreview
}
