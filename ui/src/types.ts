/** Mirrors daml/Desk/Types.daml LoanTerms (maturity as ISO string in UI). */
export type LoanTermsForm = {
  principal: number
  interestRate: number
  collateralAmount: number
  collateralPrice: number
  liquidationThreshold: number
  maxLtv: number
  /** Days from "now" for demo maturity */
  maturityDays: number
}

export type DeskParties = {
  creditOfficer: string
  lender: string
  borrower: string
  liquidator: string
  authAuthority: string
}

/** Workflow phases matching Desk.CreditApplication → Custody → Loan */
export type DeskPhase =
  | 'idle'
  | 'proposed'
  | 'lender_accepted'
  | 'accepted'
  | 'locked'
  | 'disbursed'
  | 'repaid'
  | 'liquidated'

export type AuthGrant = {
  authority: string
  subject: string
  role: 'BorrowerRole' | 'LenderRole' | 'LiquidatorRole'
  purpose: string
  correlationId: string
  contractId: string
  mode: 'mock' | 'live'
}

export type Debt = {
  principalOutstanding: number
  accruedInterest: number
}

export type DeskPosition = {
  phase: DeskPhase
  terms: LoanTermsForm | null
  proposalId: string | null
  acceptedTermsId: string | null
  vaultClaimId: string | null
  loanId: string | null
  lockedCbtc: number
  debt: Debt | null
  /** Desk mark price used for HF (can drop to demo-liquidate) */
  markPrice: number | null
  grants: AuthGrant[]
  lastError: string | null
}

export type LogEntry = {
  id: string
  at: string
  level: 'info' | 'ok' | 'warn' | 'error'
  message: string
}

export const DEFAULT_PARTIES: DeskParties = {
  creditOfficer: 'CreditOfficer::1220MOCKDESK00000000000000000000000000000',
  lender: 'Lender::1220MOCKLENDER0000000000000000000000000000000',
  borrower: 'Borrower::1220MOCKBORROWER00000000000000000000000000000',
  liquidator: 'Liquidator::1220MOCKLIQUIDATOR0000000000000000000000000',
  authAuthority: 'GroftyAuth::1220MOCKAUTHORITY0000000000000000000000000000',
}

/** Demo defaults aligned with daml/Desk/Demo.daml happy path */
export const DEFAULT_TERMS: LoanTermsForm = {
  principal: 100_000,
  interestRate: 0.08,
  collateralAmount: 2.0,
  collateralPrice: 80_000,
  liquidationThreshold: 0.85,
  maxLtv: 0.7,
  maturityDays: 90,
}

export const INITIAL_POSITION: DeskPosition = {
  phase: 'idle',
  terms: null,
  proposalId: null,
  acceptedTermsId: null,
  vaultClaimId: null,
  loanId: null,
  lockedCbtc: 0,
  debt: null,
  markPrice: null,
  grants: [],
  lastError: null,
}

export type FlowStepId =
  | 'propose'
  | 'accept'
  | 'lock'
  | 'disburse'
  | 'repay'
  | 'liquidate'

export const FLOW_STEPS: { id: FlowStepId; label: string; short: string }[] = [
  { id: 'propose', label: 'Propose terms', short: '1. Propose' },
  { id: 'accept', label: 'Accept status', short: '2. Accept' },
  { id: 'lock', label: 'Lock collateral', short: '3. Lock' },
  { id: 'disburse', label: 'Disburse', short: '4. Disburse' },
  { id: 'repay', label: 'Repay', short: '5. Repay' },
  { id: 'liquidate', label: 'Liquidate', short: '6. Liquidate' },
]
