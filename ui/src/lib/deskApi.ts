/**
 * Local mock Desk API — simulates CreditApplication → Custody → Loan choices.
 *
 * LEDGER API LATER (not wired yet):
 *   Replace each method body with JSON Ledger API / HTTP JSON API calls.
 * Auth grants come from Grofty (mock offline, or live CIP-103 when extension present).
 * CreditOfficer / Desk signer is NEVER Grofty-authorized.
 */
import type {
  AuthGrant,
  Debt,
  DeskParties,
  DeskPosition,
  LoanTermsForm,
} from '../types.ts'
import { INITIAL_POSITION } from '../types.ts'
import {
  createBrowserGroftyClient,
  purposeForChoice,
  type GroftyClient,
  type GroftyMode,
} from './groftyBrowser.ts'
import {
  debtTotal,
  healthFactor,
  isHfBreached,
  validateTerms,
} from './hf.ts'

export type DeskApi = {
  parties: DeskParties
  getGrofty(): GroftyClient
  getGroftyMode(): GroftyMode
  setGroftyMode(mode: GroftyMode): Promise<void>
  get(): DeskPosition
  reset(): DeskPosition
  proposeTerms(terms: LoanTermsForm): Promise<DeskPosition>
  lenderAccept(): Promise<DeskPosition>
  borrowerAccept(): Promise<DeskPosition>
  lockCollateral(): Promise<DeskPosition>
  disburse(): Promise<DeskPosition>
  /** Drop mark price so HF < 1 (demo path before liquidate). */
  stressMarkPrice(newPrice: number): DeskPosition
  repay(): Promise<DeskPosition>
  liquidate(): Promise<DeskPosition>
}

function cid(kind: string): string {
  return `mock-cid-${kind}-${crypto.randomUUID().slice(0, 8)}`
}

function sleep(ms = 180): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function createDeskApi(
  parties: DeskParties,
  initialMode: GroftyMode = 'mock',
): DeskApi {
  let position: DeskPosition = { ...INITIAL_POSITION, grants: [] }
  let groftyMode: GroftyMode = initialMode
  let grofty = createBrowserGroftyClient(parties.authAuthority, groftyMode)

  const set = (patch: Partial<DeskPosition>): DeskPosition => {
    position = { ...position, ...patch, lastError: patch.lastError ?? null }
    return position
  }

  const fail = (msg: string): never => {
    position = { ...position, lastError: msg }
    throw new Error(msg)
  }

  function requireTerms(): LoanTermsForm {
    const t = position.terms
    if (!t) {
      position = { ...position, lastError: 'Missing loan terms' }
      throw new Error('Missing loan terms')
    }
    return t
  }

  function requireDebt(): Debt {
    const d = position.debt
    if (!d) {
      position = { ...position, lastError: 'Missing debt' }
      throw new Error('Missing debt')
    }
    return d
  }

  const grant = async (
    choice: 'Lock' | 'Disburse' | 'Repay' | 'Liquidate',
    role: AuthGrant['role'],
    subject: string,
  ): Promise<AuthGrant> => {
    const purpose = purposeForChoice(choice)
    const payload = await grofty.authorizeSubject({
      requester: parties.creditOfficer,
      authority: parties.authAuthority,
      subject,
      role,
      purpose,
    })
    const g: AuthGrant = {
      authority: payload.authority,
      subject: payload.subject,
      role: payload.role,
      purpose: String(payload.purpose),
      correlationId: payload.correlationId ?? `pending-${Date.now()}`,
      contractId:
        payload.contractId ??
        `pending-acs-${payload.correlationId ?? Date.now()}`,
      mode: payload.mode,
    }
    position = { ...position, grants: [...position.grants, g] }
    return g
  }

  return {
    parties,

    getGrofty() {
      return grofty
    },

    getGroftyMode() {
      return groftyMode
    },

    async setGroftyMode(mode) {
      if (mode === groftyMode) return
      try {
        await grofty.disconnect()
      } catch {
        /* ignore disconnect errors when switching */
      }
      groftyMode = mode
      grofty = createBrowserGroftyClient(parties.authAuthority, mode)
    },

    get() {
      return position
    },

    reset() {
      position = { ...INITIAL_POSITION, grants: [] }
      return position
    },

    async proposeTerms(terms) {
      await sleep()
      if (position.phase !== 'idle' && position.phase !== 'proposed') {
        fail(`Cannot propose from phase ${position.phase}`)
      }
      const err = validateTerms(terms)
      if (err) fail(err)
      return set({
        phase: 'proposed',
        terms: { ...terms },
        proposalId: cid('LoanProposal'),
        acceptedTermsId: null,
        vaultClaimId: null,
        loanId: null,
        lockedCbtc: 0,
        debt: null,
        markPrice: terms.collateralPrice,
        grants: [],
      })
    },

    async lenderAccept() {
      await sleep()
      if (position.phase !== 'proposed') fail('Need proposed terms first')
      return set({ phase: 'lender_accepted' })
    },

    async borrowerAccept() {
      await sleep()
      if (position.phase !== 'lender_accepted')
        fail('Lender must accept before borrower')
      return set({
        phase: 'accepted',
        acceptedTermsId: cid('AcceptedTerms'),
      })
    },

    async lockCollateral() {
      await sleep()
      if (position.phase !== 'accepted') fail('Need AcceptedTerms before lock')
      const terms = requireTerms()
      await grant('Lock', 'BorrowerRole', parties.borrower)
      return set({
        phase: 'locked',
        vaultClaimId: cid('CollateralClaim'),
        lockedCbtc: terms.collateralAmount,
        acceptedTermsId: null,
        loanId: cid('ReadyToDisburse'),
      })
    },

    async disburse() {
      await sleep()
      if (position.phase !== 'locked') fail('Need locked collateral before disburse')
      const terms = requireTerms()
      await grant('Disburse', 'LenderRole', parties.lender)
      return set({
        phase: 'disbursed',
        loanId: cid('Loan'),
        debt: {
          principalOutstanding: terms.principal,
          accruedInterest: 0,
        },
      })
    },

    stressMarkPrice(newPrice) {
      if (!position.terms || position.phase !== 'disbursed') {
        position = {
          ...position,
          lastError: 'Stress mark only after disburse',
        }
        return position
      }
      if (!(newPrice > 0)) {
        position = { ...position, lastError: 'Mark price must be > 0' }
        return position
      }
      return set({ markPrice: newPrice, lastError: null })
    },

    async repay() {
      await sleep()
      if (position.phase !== 'disbursed') fail('Need active disbursed loan to repay')
      requireTerms()
      requireDebt()
      await grant('Repay', 'BorrowerRole', parties.borrower)
      return set({
        phase: 'repaid',
        debt: {
          principalOutstanding: 0,
          accruedInterest: 0,
        },
        lockedCbtc: 0,
        vaultClaimId: null,
      })
    },

    async liquidate() {
      await sleep()
      if (position.phase !== 'disbursed')
        fail('Need active disbursed loan to liquidate')
      const terms = requireTerms()
      const debt = requireDebt()
      const price = position.markPrice ?? terms.collateralPrice
      const breached = isHfBreached(
        position.lockedCbtc,
        price,
        terms.liquidationThreshold,
        debt,
      )
      if (!breached) {
        const hf = healthFactor(
          position.lockedCbtc,
          price,
          terms.liquidationThreshold,
          debt,
        )
        fail(
          `Healthy position — HF ${hf.toFixed(3)} ≥ 1. Drop mark price (stress) or wait for maturity.`,
        )
      }
      await grant('Liquidate', 'LiquidatorRole', parties.liquidator)
      return set({
        phase: 'liquidated',
        lockedCbtc: 0,
        vaultClaimId: null,
        debt: {
          principalOutstanding: 0,
          accruedInterest: 0,
        },
      })
    },
  }
}

export function positionSummary(p: DeskPosition): {
  hf: number | null
  ltv: number | null
  debt: number | null
} {
  if (!p.terms || !p.debt || p.phase === 'idle' || p.phase === 'proposed') {
    return { hf: null, ltv: null, debt: p.debt ? debtTotal(p.debt) : null }
  }
  if (p.phase === 'repaid' || p.phase === 'liquidated') {
    return { hf: null, ltv: null, debt: 0 }
  }
  const price = p.markPrice ?? p.terms.collateralPrice
  const coll = p.lockedCbtc || p.terms.collateralAmount
  const d = debtTotal(p.debt)
  return {
    hf: healthFactor(coll, price, p.terms.liquidationThreshold, p.debt),
    ltv: d / (coll * price),
    debt: d,
  }
}
