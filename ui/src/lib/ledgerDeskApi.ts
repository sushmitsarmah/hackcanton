/**
 * Ledger-backed Desk API. Same surface as `createDeskApi` (the mock) but every
 * step submits real commands to the Canton JSON Ledger API against a running
 * sandbox (Path A). Mirrors the exact sequence in daml/Desk/Demo.daml:
 *
 *   mint CBTC/USDCx → grant auths → LoanProposal → LenderAccept → BorrowerAccept
 *   → PrepareOrigination → LockAndPrepare → Disburse → (Repay | UpdateMarkPrice + LiquidateFast)
 *
 * Auth grants come from a local GroftyAuth stand-in party (no wallet needed on
 * LocalNet). The Grofty *client* is still exposed for the Live panel, unchanged.
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
  type GroftyMode,
} from './groftyBrowser.ts'
import { debtTotal, healthFactor, isHfBreached, validateTerms } from './hf.ts'
import {
  LedgerClient,
  createCmd,
  exerciseCmd,
  type ContractEvent,
} from './ledgerClient.ts'
import type { DeskApi } from './deskApi.ts'

const CBTC = 'CBTC'
const USDCX = 'USDCx'
const POLICY_PURPOSES = {
  lock: 'desk.lock-collateral',
  disburse: 'desk.disburse',
  repay: 'desk.repay',
  liquidate: 'desk.liquidate',
} as const

function toLedgerDecimals(terms: LoanTermsForm, maturity?: string) {
  const maturityIso =
    maturity ?? new Date(Date.now() + terms.maturityDays * 86_400_000).toISOString()
  return {
    principal: terms.principal.toFixed(1),
    interestRate: terms.interestRate.toString(),
    collateralAmount: terms.collateralAmount.toFixed(1),
    collateralPrice: terms.collateralPrice.toFixed(1),
    liquidationThreshold: terms.liquidationThreshold.toString(),
    maxLtv: terms.maxLtv.toString(),
    maturity: maturityIso,
  }
}

/**
 * Build a DeskApi whose commands hit the ledger. `parties` maps hint → party id
 * from the ledger; the console uses those ids throughout.
 */
export function createLedgerDeskApi(
  parties: DeskParties,
  ledger: LedgerClient,
  initialMode: GroftyMode = 'mock',
): DeskApi {
  let position: DeskPosition = { ...INITIAL_POSITION, grants: [] }
  let groftyMode: GroftyMode = initialMode
  let grofty = createBrowserGroftyClient(parties.authAuthority, groftyMode)

  // Sub-step telemetry: emit real ledger tx ids + contract ids to the UI log.
  type Ev = { level: 'info' | 'ok' | 'warn' | 'error'; message: string }
  const listeners = new Set<(e: Ev) => void>()
  const emit = (level: Ev['level'], message: string) => {
    for (const l of listeners) l({ level, message })
  }
  const short = (s: string) => (s ? `${s.slice(0, 10)}…${s.slice(-4)}` : '—')
  const ledgerSubmit = async (
    label: string,
    actAs: string[],
    commands: unknown[],
  ) => {
    emit('info', `→ ledger: ${label} (actAs ${actAs.map((p) => p.split('::')[0]).join(', ')})`)
    const t = await ledger.submit(actAs, commands)
    const created = t.events.map((e) => e.templateId.split(':').pop()).join(', ')
    emit('ok', `← ledger tx ${short(t.updateId)} · created: ${created || '—'}`)
    return t
  }

  // Contract ids that must persist across steps.
  let cbtcHolding = ''
  let usdcHolding = ''
  let lockAuthContractId: string | null = null
  let lenderDisburseAuth: string | null = null
  let borrowerDisburseAuth: string | null = null
  let vaultCid: string | null = null
  // Ledger terms frozen at propose time (maturity must be identical across every
  // later step, or the on-ledger `terms match accepted` assertion fails).
  let ledgerTerms: ReturnType<typeof toLedgerDecimals> | null = null
  const requireLedgerTerms = () => {
    if (!ledgerTerms) {
      position = { ...position, lastError: 'Missing ledger terms' }
      throw new Error('Missing ledger terms')
    }
    return ledgerTerms
  }

  const set = (patch: Partial<DeskPosition>): DeskPosition => {
    position = { ...position, ...patch, lastError: patch.lastError ?? null }
    return position
  }
  function fail(msg: string): never {
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
  const first = (events: ContractEvent[], suffix: string) =>
    LedgerClient.firstCreated(events, suffix).contractId

  const P = {
    creditOfficer: parties.creditOfficer,
    lender: parties.lender,
    borrower: parties.borrower,
    liquidator: parties.liquidator,
    issuer: parties.issuer,
    authAuthority: parties.authAuthority,
  }

  /** Mint a holding to a recipient (issuer posts, recipient accepts). */
  const mint = async (recipient: string, asset: string, amount: string) => {
    const t1 = await ledgerSubmit(`mint ${amount} ${asset} → ${recipient.split('::')[0]}`, [P.issuer], [
      createCmd('Desk.MockToken:MintRequest', {
        instrumentAdmin: P.issuer,
        recipient,
        asset,
        amount,
      }),
    ])
    const req = first(t1.events, 'MintRequest')
    const t2 = await ledgerSubmit(`accept mint (${asset})`, [recipient], [
      exerciseCmd('Desk.MockToken:MintRequest', req, 'AcceptMint'),
    ])
    return first(t2.events, 'MockHolding')
  }

  /** Grant auth via a local GroftyAuth stand-in party. */
  const grantAuth = async (
    subject: string,
    role: string,
    purpose: string,
  ): Promise<AuthGrant> => {
    const t1 = await ledgerSubmit(`propose auth ${role}/${purpose} for ${subject.split('::')[0]}`, [P.creditOfficer], [
      createCmd('Desk.Auth:AuthorizationProposal', {
        requester: P.creditOfficer,
        authority: P.authAuthority,
        subject,
        role,
        purpose,
      }),
    ])
    const prop = first(t1.events, 'AuthorizationProposal')
    const t2 = await ledgerSubmit(`grant auth ${role}/${purpose}`, [P.authAuthority], [
      exerciseCmd('Desk.Auth:AuthorizationProposal', prop, 'Grant'),
    ])
    const cid = first(t2.events, 'AuthorizationGranted')
    const g: AuthGrant = {
      authority: P.authAuthority,
      subject,
      role: role as AuthGrant['role'],
      purpose,
      correlationId: t2.updateId,
      contractId: cid,
      mode: 'mock',
    }
    position = { ...position, grants: [...position.grants, g] }
    return g
  }

  return {
    parties,
    backend: 'ledger',
    onEvent(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

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
        /* ignore */
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
      if (position.phase !== 'idle' && position.phase !== 'proposed') {
        fail(`Cannot propose from phase ${position.phase}`)
      }
      const err = validateTerms(terms)
      if (err) fail(err)

      // Seed holdings + grants so the proposal carries valid auth cids.
      const lenderAuthD = await grantAuth(P.lender, 'LenderRole', POLICY_PURPOSES.disburse)
      const borrowerAuthD = await grantAuth(P.borrower, 'BorrowerRole', POLICY_PURPOSES.disburse)
      const borrowerAuthL = await grantAuth(P.borrower, 'BorrowerRole', POLICY_PURPOSES.lock)
      // Stash lock auth in a closure var for lockCollateral; keep in grants list.
      lockAuthContractId = borrowerAuthL.contractId
      // Mint collateral + lender USDCx prefund.
      cbtcHolding = await mint(P.borrower, CBTC, terms.collateralAmount.toFixed(1))
      usdcHolding = await mint(P.lender, USDCX, terms.principal.toFixed(1))
      lenderDisburseAuth = lenderAuthD.contractId
      borrowerDisburseAuth = borrowerAuthD.contractId

      ledgerTerms = toLedgerDecimals(terms)
      const lt = ledgerTerms
      const policy = { authRequired: true, trustedAuthority: P.authAuthority }
      const t = await ledgerSubmit('create LoanProposal', [P.creditOfficer], [
        createCmd('Desk.CreditApplication:LoanProposal', {
          creditOfficer: P.creditOfficer,
          lender: P.lender,
          borrower: P.borrower,
          liquidator: P.liquidator,
          terms: lt,
          authPolicy: policy,
          lenderAuthCid: lenderAuthD.contractId,
          borrowerAuthCid: borrowerAuthD.contractId,
          liquidatorAuthCid: null,
        }),
      ])
      const proposalId = first(t.events, 'LoanProposal')
      return set({
        phase: 'proposed',
        terms: { ...terms },
        proposalId,
        acceptedTermsId: null,
        vaultClaimId: null,
        loanId: null,
        lockedCbtc: 0,
        debt: null,
        markPrice: terms.collateralPrice,
        grants: [...position.grants],
      })
    },

    async lenderAccept() {
      if (position.phase !== 'proposed') fail('Need proposed terms first')
      const proposalId = position.proposalId
      if (!proposalId) fail('Missing proposal id')
      const t = await ledgerSubmit('LenderAccept', [P.lender], [
        exerciseCmd('Desk.CreditApplication:LoanProposal', proposalId, 'LenderAccept'),
      ])
      return set({
        phase: 'lender_accepted',
        proposalId: first(t.events, 'LenderAccepted'),
      })
    },

    async borrowerAccept() {
      if (position.phase !== 'lender_accepted') fail('Lender must accept before borrower')
      const proposalId = position.proposalId
      if (!proposalId) fail('Missing proposal id')
      const t = await ledgerSubmit('BorrowerAccept', [P.borrower], [
        exerciseCmd('Desk.CreditApplication:LenderAccepted', proposalId, 'BorrowerAccept'),
      ])
      return set({
        phase: 'accepted',
        acceptedTermsId: first(t.events, 'AcceptedTerms'),
      })
    },

    async lockCollateral() {
      if (position.phase !== 'accepted') fail('Need AcceptedTerms before lock')
      const terms = requireTerms()
      if (!position.acceptedTermsId) fail('Missing AcceptedTerms')
      const policy = { authRequired: true, trustedAuthority: P.authAuthority }
      const lt = requireLedgerTerms()
      const t1 = await ledgerSubmit('create PrepareOrigination', [P.creditOfficer], [
        createCmd('Desk.Loan:PrepareOrigination', {
          creditOfficer: P.creditOfficer,
          lender: P.lender,
          borrower: P.borrower,
          liquidator: P.liquidator,
          terms: lt,
          authPolicy: policy,
          acceptedTermsCid: position.acceptedTermsId,
        }),
      ])
      const prep = first(t1.events, 'PrepareOrigination')
      const t2 = await ledgerSubmit('LockAndPrepare (CBTC → Desk custody)', [P.borrower, P.creditOfficer, P.lender], [
        exerciseCmd('Desk.Loan:PrepareOrigination', prep, 'LockAndPrepare', {
          borrowerCbtc: cbtcHolding,
          borrowerAuthCid: lockAuthContractId,
        }),
      ])
      const readyEvent = LedgerClient.firstCreated(t2.events, 'ReadyToDisburse')
      // The vault was created during LockAndPrepare; keep its cid for display.
      vaultCid =
        (readyEvent.createArgument.vaultCid as string | undefined) ?? vaultCid
      return set({
        phase: 'locked',
        vaultClaimId: readyEvent.contractId,
        lockedCbtc: terms.collateralAmount,
        acceptedTermsId: null,
        loanId: null,
      })
    },

    async disburse() {
      if (position.phase !== 'locked') fail('Need locked collateral before disburse')
      const terms = requireTerms()
      const readyId = position.vaultClaimId
      if (!readyId) fail('Missing ReadyToDisburse')
      const t = await ledgerSubmit('Disburse USDCx (lender prefund)', [P.lender, P.borrower, P.creditOfficer], [
        exerciseCmd('Desk.Loan:ReadyToDisburse', readyId, 'Disburse', {
          lenderUsdcx: usdcHolding,
          lenderAuthCid: lenderDisburseAuth,
          borrowerAuthCid: borrowerDisburseAuth,
        }),
      ])
      const loan = first(t.events, 'Loan')
      return set({
        phase: 'disbursed',
        loanId: loan,
        vaultClaimId: vaultCid,
        debt: { principalOutstanding: terms.principal, accruedInterest: 0 },
      })
    },

    stressMarkPrice(newPrice) {
      if (!position.terms || position.phase !== 'disbursed') {
        position = { ...position, lastError: 'Stress mark only after disburse' }
        return position
      }
      if (!(newPrice > 0)) {
        position = { ...position, lastError: 'Mark price must be > 0' }
        return position
      }
      // Update on-ledger mark price as the creditOfficer.
      if (position.loanId) {
        ledgerSubmit(`UpdateMarkPrice → ${newPrice.toLocaleString()}`, [P.creditOfficer], [
          exerciseCmd('Desk.Loan:Loan', position.loanId, 'UpdateMarkPrice', {
            newPrice: newPrice.toFixed(1),
          }),
        ])
          .then((t) => {
            const updated = first(t.events, 'Loan')
            position = { ...position, loanId: updated }
          })
          .catch(() => {
            /* surface on next action */
          })
      }
      return set({ markPrice: newPrice, lastError: null })
    },

    async repay() {
      if (position.phase !== 'disbursed') fail('Need active disbursed loan to repay')
      requireTerms()
      const debt = requireDebt()
      const loanId = position.loanId
      if (!loanId) fail('Missing loan id')
      const due = debtTotal(debt)
      const repayHolding = await mint(P.borrower, USDCX, (due + 1.0).toFixed(1))
      const borrowerAuthR = await grantAuth(P.borrower, 'BorrowerRole', POLICY_PURPOSES.repay)
      const lenderAuthR = await grantAuth(P.lender, 'LenderRole', POLICY_PURPOSES.repay)
      await ledgerSubmit('Repay (USDCx → lender, CBTC released)', [P.borrower, P.creditOfficer, P.lender], [
        exerciseCmd('Desk.Loan:Loan', loanId, 'Repay', {
          repaymentUsdcx: repayHolding,
          borrowerAuthCid: borrowerAuthR.contractId,
          lenderAuthCid: lenderAuthR.contractId,
        }),
      ])
      return set({
        phase: 'repaid',
        debt: { principalOutstanding: 0, accruedInterest: 0 },
        lockedCbtc: 0,
        vaultClaimId: null,
      })
    },

    async liquidate() {
      if (position.phase !== 'disbursed') fail('Need active disbursed loan to liquidate')
      const terms = requireTerms()
      const debt = requireDebt()
      const loanId = position.loanId
      if (!loanId) fail('Missing loan id')
      const price = position.markPrice ?? terms.collateralPrice
      if (!isHfBreached(position.lockedCbtc, price, terms.liquidationThreshold, debt)) {
        const hf = healthFactor(position.lockedCbtc, price, terms.liquidationThreshold, debt)
        fail(
          `Healthy position — HF ${hf.toFixed(3)} ≥ 1. Drop mark price (stress) or wait for maturity.`,
        )
      }
      const liquidatorAuth = await grantAuth(P.liquidator, 'LiquidatorRole', POLICY_PURPOSES.liquidate)
      await ledgerSubmit('LiquidateFast (seize CBTC → liquidator)', [P.liquidator, P.creditOfficer], [
        exerciseCmd('Desk.Loan:Loan', loanId, 'LiquidateFast', {
          liquidatorAuthCid: liquidatorAuth.contractId,
        }),
      ])
      return set({
        phase: 'liquidated',
        lockedCbtc: 0,
        vaultClaimId: null,
        debt: { principalOutstanding: 0, accruedInterest: 0 },
      })
    },
  }
}
