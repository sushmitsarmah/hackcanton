import type { AuthRole, DeskAuthPurpose } from './purposes.js'

export type GroftyMode = 'mock' | 'live'

export type ConnectedAccount = {
  partyId: string
  /** Optional display hint from wallet */
  hint?: string
}

/**
 * Payload shape that maps to Desk.Auth:AuthorizationGranted create arguments.
 * In live mode this is the evidence returned after the authority signs Grant.
 */
export type AuthorizationGrantedPayload = {
  authority: string
  subject: string
  role: AuthRole
  purpose: DeskAuthPurpose | string
  /** Optional correlation / tx id from wallet prepareExecute */
  correlationId?: string
  /** Ledger contract id when known (after submit) */
  contractId?: string
  mode: GroftyMode
}

export type RequestAuthorizationArgs = {
  requester: string
  subject: string
  role: AuthRole
  purpose: DeskAuthPurpose | string
}

export type AuthorizationProposalArgs = {
  requester: string
  /** Grofty / auth-oracle party — NOT the Desk signer */
  authority: string
  subject: string
  role: AuthRole
  purpose: DeskAuthPurpose | string
}

export type GrantAuthRequest = {
  /** Existing AuthorizationProposal contract id on ledger */
  proposalContractId: string
  /** Template id for Desk.Auth:AuthorizationProposal (package-qualified or #pkg:Module:Entity) */
  proposalTemplateId?: string
  args: AuthorizationProposalArgs
}

export type ConnectResult = {
  mode: GroftyMode
  isConnected: boolean
  accounts: ConnectedAccount[]
  providerLabel: string
}

export type TransactResult = {
  mode: GroftyMode
  submitted: boolean
  /** Wallet / mock correlation */
  correlationId?: string
  /** Raw wallet prepareExecute response when available */
  raw?: unknown
}

/**
 * Production-shaped client surface used by UI / scripts.
 * Live = CIP-103 via @canton-network/dapp-sdk (+ Grofty extension when present).
 * Mock = offline deterministic payloads for LocalNet / CI.
 */
export interface GroftyClient {
  readonly mode: GroftyMode
  connect(): Promise<ConnectResult>
  disconnect(): Promise<void>
  listAccounts(): Promise<ConnectedAccount[]>
  /**
   * Build + optionally submit RequestAuthorization create.
   * Does not grant; subject/authority still need Grant path.
   */
  requestAuthorization(
    args: RequestAuthorizationArgs,
    opts?: { submit?: boolean; templateId?: string },
  ): Promise<{ command: unknown; result?: TransactResult }>
  /**
   * Exercise AuthorizationProposal.Grant via connected wallet (authority controller).
   * Returns AuthorizationGrantedPayload for ledger consumers.
   */
  grantAuthorization(
    req: GrantAuthRequest,
    opts?: { submit?: boolean },
  ): Promise<{ payload: AuthorizationGrantedPayload; result?: TransactResult }>
  /**
   * Convenience: mock/live path that returns AuthorizationGranted evidence
   * without requiring a prior proposal cid (mock always; live needs submit+cid).
   */
  authorizeSubject(args: AuthorizationProposalArgs): Promise<AuthorizationGrantedPayload>
}

export type GroftyClientConfig = {
  mode?: GroftyMode
  /**
   * Package / template id prefix for Desk.Auth templates.
   * Default: #cbtc-collateral-desk:Desk.Auth
   */
  authModuleId?: string
  /**
   * Optional remote CIP-103 gateway URL (MainNet-oriented).
   * Used when Grofty extension is not injected / for RemoteAdapter fallback.
   */
  remoteGatewayRpcUrl?: string
  /** Prefer connecting to this provider id when live (Grofty extension). */
  preferredProviderId?: string
  /** Mock authority party id when mode=mock */
  mockAuthorityParty?: string
}
