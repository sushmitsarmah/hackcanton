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

/** Create args for Desk.Auth:AuthorizationGranted (signatory = authority). */
export type AuthorizationGrantedArgs = {
  authority: string
  subject: string
  role: AuthRole
  purpose: DeskAuthPurpose | string
}

/**
 * Result of a live grant: the evidence payload plus the ledger-assigned
 * contract id discovered via ACS (prepareExecuteAndWait does not return it).
 */
export type GrantAuthorizationResult = {
  payload: AuthorizationGrantedPayload
  result?: TransactResult
  /** Ledger contract id when ACS discovery succeeded */
  contractId?: string
  /** Ledger update id from prepareExecuteAndWait, when available */
  updateId?: string
}

export type ConnectResult = {
  mode: GroftyMode
  isConnected: boolean
  accounts: ConnectedAccount[]
  providerLabel: string
}

export type TransactResult = {
  mode: GroftyMode
  /**
   * True only when the command was handed off to the wallet. For the
   * non-waiting prepareExecute this is a request, not a ledger confirmation;
   * check `waited`/`updateId` for a settled transaction.
   */
  submitted: boolean
  /** True when prepareExecuteAndWait settled the transaction (updateId set). */
  waited?: boolean
  /**
   * Ledger update id from prepareExecuteAndWait, when the call waited.
   * prepareExecute returns null, so it is absent on the request path.
   */
  updateId?: string
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
  ): Promise<GrantAuthorizationResult>
  /**
   * Live primary path: the authority wallet creates AuthorizationGranted directly
   * (signatory = authority per Desk.Auth), then the ledger cid is discovered via ACS.
   * No CreditOfficer proposal round-trip is required.
   */
  createGrant(
    args: AuthorizationGrantedArgs,
    opts?: { submit?: boolean },
  ): Promise<GrantAuthorizationResult>
  /**
   * Convenience: mock/live path that returns AuthorizationGranted evidence.
   * Live delegates to createGrant (wallet signs as authority) and resolves the
   * real contract id via ACS discovery.
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
  /**
   * JSON Ledger API v2 resource used to discover AuthorizationGranted cids
   * after prepareExecuteAndWait. Default: /v2/state/active-contracts.
   */
  activeContractsResource?: string
}
