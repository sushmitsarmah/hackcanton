import {
  buildAuthorizationGrantedCreate,
  buildAuthorizationProposalCreate,
  buildGrantExercise,
  buildRequestAuthorizationCreate,
  DEFAULT_AUTH_MODULE,
} from './commands.js'
import { newCorrelationId } from './id.js'
import type {
  AuthorizationGrantedArgs,
  AuthorizationGrantedPayload,
  AuthorizationProposalArgs,
  ConnectResult,
  GrantAuthRequest,
  GrantAuthorizationResult,
  GroftyClient,
  GroftyClientConfig,
  RequestAuthorizationArgs,
  TransactResult,
} from './types.js'

/**
 * Offline adapter: production-shaped surface without wallet keys / whitelist.
 * Use GROFTY_MODE=mock for LocalNet scripts and CI.
 * Browser-safe (no node:crypto) so Vite can import this package.
 */
export class MockGroftyClient implements GroftyClient {
  readonly mode = 'mock' as const
  private connected = false
  private readonly authority: string
  private readonly authModuleId: string
  private accounts: { partyId: string; hint?: string }[]

  constructor(config: GroftyClientConfig = {}) {
    this.authority =
      config.mockAuthorityParty ?? 'GroftyAuth::1220MOCKAUTHORITY0000000000000000000000000000'
    this.authModuleId = config.authModuleId ?? DEFAULT_AUTH_MODULE
    this.accounts = [
      { partyId: this.authority, hint: 'mock-grofty-authority' },
      {
        partyId: 'Borrower::1220MOCKBORROWER00000000000000000000000000000',
        hint: 'mock-borrower',
      },
      {
        partyId: 'Lender::1220MOCKLENDER0000000000000000000000000000000',
        hint: 'mock-lender',
      },
      {
        partyId: 'Liquidator::1220MOCKLIQUIDATOR0000000000000000000000000',
        hint: 'mock-liquidator',
      },
    ]
  }

  async connect(): Promise<ConnectResult> {
    this.connected = true
    return {
      mode: 'mock',
      isConnected: true,
      accounts: this.accounts,
      providerLabel: 'MockGroftyClient',
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async listAccounts() {
    if (!this.connected) await this.connect()
    return this.accounts
  }

  async requestAuthorization(
    args: RequestAuthorizationArgs,
    opts?: { submit?: boolean; templateId?: string },
  ) {
    const templateId =
      opts?.templateId ?? `${this.authModuleId}:RequestAuthorization`
    const command = buildRequestAuthorizationCreate(args, templateId)
    let result: TransactResult | undefined
    if (opts?.submit !== false) {
      result = {
        mode: 'mock',
        submitted: true,
        correlationId: newCorrelationId('mock-req'),
        raw: { command, note: 'mock create; no ledger submit' },
      }
    }
    return { command, result }
  }

  async grantAuthorization(
    req: GrantAuthRequest,
    opts?: { submit?: boolean },
  ): Promise<GrantAuthorizationResult> {
    const templateId =
      req.proposalTemplateId ?? `${this.authModuleId}:AuthorizationProposal`
    const command = buildGrantExercise(req.proposalContractId, templateId)
    const correlationId = newCorrelationId('mock-grant')
    const contractId = `mock-cid-AuthorizationGranted-${correlationId}`
    const payload: AuthorizationGrantedPayload = {
      authority: req.args.authority || this.authority,
      subject: req.args.subject,
      role: req.args.role,
      purpose: req.args.purpose,
      correlationId,
      contractId,
      mode: 'mock',
    }
    let result: TransactResult | undefined
    if (opts?.submit !== false) {
      result = {
        mode: 'mock',
        submitted: true,
        correlationId,
        raw: { command, payload },
      }
    }
    return { payload, result, contractId }
  }

  /**
   * Mock direct create of AuthorizationGranted (mirrors the live primary path,
   * where the authority wallet is the signatory).
   */
  async createGrant(
    args: AuthorizationGrantedArgs,
    opts?: { submit?: boolean },
  ): Promise<GrantAuthorizationResult> {
    const command = buildAuthorizationGrantedCreate(
      { ...args, authority: args.authority || this.authority },
      `${this.authModuleId}:AuthorizationGranted`,
    )
    const correlationId = newCorrelationId('mock-grant')
    const contractId = `mock-cid-AuthorizationGranted-${correlationId}`
    const payload: AuthorizationGrantedPayload = {
      authority: args.authority || this.authority,
      subject: args.subject,
      role: args.role,
      purpose: args.purpose,
      correlationId,
      contractId,
      mode: 'mock',
    }
    let result: TransactResult | undefined
    if (opts?.submit !== false) {
      result = {
        mode: 'mock',
        submitted: true,
        correlationId,
        raw: { command, payload },
      }
    }
    return { payload, result, contractId }
  }

  async authorizeSubject(
    args: AuthorizationProposalArgs,
  ): Promise<AuthorizationGrantedPayload> {
    const { payload } = await this.createGrant({
      authority: args.authority || this.authority,
      subject: args.subject,
      role: args.role,
      purpose: args.purpose,
    })
    return payload
  }

  /** Expose proposal create for prove script inspection */
  buildProposalCreate(args: AuthorizationProposalArgs) {
    return buildAuthorizationProposalCreate(
      { ...args, authority: args.authority || this.authority },
      `${this.authModuleId}:AuthorizationProposal`,
    )
  }
}
