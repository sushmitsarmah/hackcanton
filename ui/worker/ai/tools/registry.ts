import type { ToolDefinition } from '../types.ts'
import type { AgentTool, AgentToolContext, DeskSnapshot, ToolPreview } from './types.ts'

/**
 * The assistant's tools. Read/navigate tools run in the Worker; propose tools
 * never execute here — they return a preview and the browser asks the operator
 * to confirm, then runs the same desk action the UI button would.
 *
 * This is the guardrail: the model can only *ask* for a state change.
 */
const STEPS = ['propose', 'accept', 'lock', 'disburse', 'repay', 'liquidate'] as const

function fmt(n: number | null | undefined, digits = 2): string {
  return n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

const tools: AgentTool[] = [
  {
    name: 'navigate',
    kind: 'navigate',
    description:
      'Open a step of the desk console. Use when the user asks to see a page or step.',
    parameters: {
      type: 'object',
      properties: {
        step: { type: 'string', enum: STEPS, description: 'The console step to open.' },
      },
      required: ['step'],
      additionalProperties: false,
    },
    run: async (args) => {
      const step = String(args.step)
      if (!(STEPS as readonly string[]).includes(step)) {
        return { text: `Unknown step "${step}".` }
      }
      return { text: `Opened the ${step} step.`, route: step }
    },
  },
  {
    name: 'get_desk_state',
    kind: 'read',
    description:
      'Read the current desk state: phase, step, loan terms, locked CBTC, debt, mark price, health factor, LTV, and grant count.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    run: async (_args, ctx) => ({ text: describeDesk(ctx.desk) }),
  },
  {
    name: 'explain_health_factor',
    kind: 'read',
    description:
      'Explain the current health factor and LTV, and how far the position is from liquidation.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    run: async (_args, ctx) => {
      const { desk } = ctx
      if (desk.healthFactor == null) {
        return { text: 'No active loan, so there is no health factor yet.' }
      }
      const hf = desk.healthFactor
      const state = hf < 1 ? 'BELOW 1 — liquidatable' : 'at or above 1 — healthy'
      return {
        text: `Health factor is ${hf.toFixed(3)} (${state}). LTV is ${desk.ltv != null ? (desk.ltv * 100).toFixed(1) + '%' : '—'}. HF = collateralValue × liquidationThreshold / debt. A loan is liquidatable when HF < 1.`,
      }
    },
  },
  {
    name: 'propose_terms',
    kind: 'propose',
    description:
      'Propose bilateral loan terms (creates a LoanProposal). Principal/interest/collateral etc. as decimal numbers.',
    parameters: {
      type: 'object',
      properties: {
        principal: { type: 'number', description: 'USDCx principal.' },
        interestRate: { type: 'number', description: 'Annual rate, e.g. 0.08.' },
        collateralAmount: { type: 'number', description: 'CBTC collateral.' },
        collateralPrice: { type: 'number', description: 'USDCx per CBTC mark.' },
        liquidationThreshold: { type: 'number', description: 'e.g. 0.85.' },
        maxLtv: { type: 'number', description: 'e.g. 0.70.' },
        maturityDays: { type: 'number', description: 'Days to maturity.' },
      },
      required: ['principal', 'interestRate', 'collateralAmount', 'collateralPrice', 'liquidationThreshold', 'maxLtv', 'maturityDays'],
      additionalProperties: false,
    },
    preview: (args) => ({
      action: 'Propose loan terms',
      fields: [
        { label: 'Principal', value: `${fmt(Number(args.principal), 0)} USDCx` },
        { label: 'Interest', value: `${(Number(args.interestRate) * 100).toFixed(2)}% / yr` },
        { label: 'Collateral', value: `${fmt(Number(args.collateralAmount))} CBTC` },
        { label: 'Mark price', value: `${fmt(Number(args.collateralPrice), 0)} USDCx/CBTC` },
        { label: 'Max LTV', value: `${(Number(args.maxLtv) * 100).toFixed(0)}%` },
        { label: 'Liq. threshold', value: `${(Number(args.liquidationThreshold) * 100).toFixed(0)}%` },
        { label: 'Maturity', value: `${Number(args.maturityDays)} days` },
      ],
      note: 'Creates a LoanProposal as the credit officer (Desk signer).',
    }),
    run: async () => ({ text: 'proposed' }),
  },
  {
    name: 'desk_action',
    kind: 'propose',
    description:
      'Propose a workflow action: accept (lender/borrower), lock collateral, disburse, repay, or liquidate. The operator confirms.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['lender_accept', 'borrower_accept', 'lock', 'disburse', 'repay', 'liquidate'],
        },
        stressPrice: {
          type: 'number',
          description: 'Only for liquidate: drop the mark price first to breach HF.',
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
    preview: (args, ctx) => {
      const action = String(args.action)
      const labels: Record<string, string> = {
        lender_accept: 'Lender accepts terms',
        borrower_accept: 'Borrower accepts terms',
        lock: 'Lock CBTC collateral',
        disburse: 'Disburse USDCx',
        repay: 'Full repay + release collateral',
        liquidate: 'Liquidate + seize collateral',
      }
      const fields = [{ label: 'Action', value: labels[action] ?? action }]
      if (action === 'liquidate' && args.stressPrice != null) {
        fields.push({ label: 'Stress mark', value: `${fmt(Number(args.stressPrice), 0)} USDCx/CBTC` })
      }
      fields.push({ label: 'Current phase', value: ctx.desk.phase })
      return {
        action: labels[action] ?? action,
        fields,
        note: 'Runs the same desk action the console button runs, after you confirm.',
      }
    },
    run: async () => ({ text: 'done' }),
  },
]

export function allTools(): AgentTool[] {
  return tools
}

export function toolDefinitions(): ToolDefinition[] {
  return tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }))
}

export function findTool(name: string): AgentTool | undefined {
  return tools.find((t) => t.name === name)
}

/** Human label for a tool card. */
const TOOL_LABELS: Record<string, string> = {
  navigate: 'Open step',
  get_desk_state: 'Read desk state',
  explain_health_factor: 'Explain health factor',
  propose_terms: 'Propose loan terms',
  desk_action: 'Desk action',
}
export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, ' ')
}

export function describeDesk(desk: DeskSnapshot): string {
  const parts: string[] = [`Phase: ${desk.phase} (step: ${desk.step}).`]
  if (desk.terms) {
    parts.push(
      `Terms — principal ${fmt(desk.terms.principal, 0)} USDCx, rate ${(desk.terms.interestRate * 100).toFixed(2)}%, collateral ${fmt(desk.terms.collateralAmount)} CBTC @ ${fmt(desk.terms.collateralPrice, 0)}, maxLtv ${(desk.terms.maxLtv * 100).toFixed(0)}%, liq threshold ${(desk.terms.liquidationThreshold * 100).toFixed(0)}%, ${desk.terms.maturityDays}d.`,
    )
  } else {
    parts.push('No terms proposed yet.')
  }
  parts.push(
    `Locked CBTC: ${fmt(desk.lockedCbtc, 4)}. Debt: ${fmt(desk.debt)} USDCx. Mark: ${fmt(desk.markPrice, 0)}. HF: ${desk.healthFactor != null ? desk.healthFactor.toFixed(3) : '—'}. LTV: ${desk.ltv != null ? (desk.ltv * 100).toFixed(1) + '%' : '—'}. Auth grants: ${desk.grants}.`,
  )
  if (desk.lastError) parts.push(`Last error: ${desk.lastError}`)
  return parts.join(' ')
}

export type { AgentTool, AgentToolContext, DeskSnapshot, ToolPreview }
