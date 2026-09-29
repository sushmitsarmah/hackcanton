/**
 * Evidence shapes that map to FUTURE(DecMan) comments in daml/Desk/*.
 * These are documentation-grade stubs until a real DecMan node is wired.
 */

/** PROJECT_PLAN §5.3 control ids */
export type DecManControl =
  | 'topology-ownership'
  | 'tx-confirmation'
  | 'app-governance'

export type DecManMode = 'scaffold' | 'http'

/** Optional fields planned on AuthorizationGranted (Auth.daml FUTURE markers). */
export interface DecManEvidencePayload {
  control: DecManControl
  /** Opaque correlation / proposal / confirmation id from DecMan */
  evidenceId: string
  /** Human-readable summary for demo recordings */
  summary: string
  /** Network claim — never invent MainNet/DevNet without a real party */
  networkClaim: 'scaffold' | 'localnet' | 'devnet' | 'mainnet'
  capturedAtIso: string
}

export interface TopologyProposalStub {
  control: 'topology-ownership'
  deskPartyHint: string
  intendedHosts: string[]
  thresholdPolicyHint: string
  workflow: string[]
  /** Operator API routes (docs) — not called in scaffold */
  relatedRoutes: string[]
}

export interface TxConfirmationStub {
  control: 'tx-confirmation'
  deskAction:
    | 'lock'
    | 'release'
    | 'seize'
    | 'disburse'
    | 'liquidate-gated'
    | 'liquidate-fast'
  requiresThreshold: boolean
  workflow: string[]
  relatedRoutes: string[]
  damlMarker: string
}

export interface AppGovernanceStub {
  control: 'app-governance'
  subject: 'product-params' | 'party-onboarding'
  thresholdHint: string
  workflow: string[]
  relatedRoutes: string[]
  damlMarker: string
}

export interface DecManClientConfig {
  mode: DecManMode
  baseUrl?: string
  token?: string
  deskPartyId?: string
  evidencePrefix?: string
  adminRole?: string
}

export interface NodeConfigSnapshot {
  ok: boolean
  mode: DecManMode
  /** Raw JSON from GET /node-config when http mode succeeds */
  body?: unknown
  error?: string
}
