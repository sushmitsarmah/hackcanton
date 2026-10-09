/**
 * Browser Grofty client — wraps @cbtc-collateral-desk/grofty (CIP-0103).
 *
 * Mock: offline AuthorizationGranted payloads (Web Crypto; no node:crypto).
 * Live: @canton-network/dapp-sdk prepareExecute / Grant when Grofty extension present.
 */
import {
  GROFTY_EXTENSION_ID,
  GROFTY_INSTALL_URL,
  GROFTY_PROVIDER_ID,
  GROFTY_QUICKSTART_URL,
  PURPOSE_ADD_COLLATERAL,
  PURPOSE_DISBURSE,
  PURPOSE_GOVERNED_CUSTODY_RELEASE,
  PURPOSE_LIQUIDATE,
  PURPOSE_LOCK,
  PURPOSE_REPAY,
  createGroftyClient,
  detectCip103Provider,
  formatGroftyError,
  requestAnnouncedProviders,
  type AnnouncedProvider,
  type AuthorizationGrantedPayload,
  type AuthorizationProposalArgs,
  type ConnectResult,
  type GrantAuthRequest,
  type GrantAuthorizationResult,
  type GroftyClient,
  type GroftyMode,
  type RequestAuthorizationArgs,
  type TransactResult,
} from '@cbtc-collateral-desk/grofty/browser'

export {
  PURPOSE_LOCK,
  PURPOSE_DISBURSE,
  PURPOSE_ADD_COLLATERAL,
  PURPOSE_REPAY,
  PURPOSE_LIQUIDATE,
  PURPOSE_GOVERNED_CUSTODY_RELEASE,
  GROFTY_EXTENSION_ID,
  GROFTY_PROVIDER_ID,
  GROFTY_INSTALL_URL,
  GROFTY_QUICKSTART_URL,
  detectCip103Provider,
  requestAnnouncedProviders,
  formatGroftyError,
  createGroftyClient,
}

export type {
  AnnouncedProvider,
  AuthorizationGrantedPayload,
  AuthorizationProposalArgs,
  ConnectResult,
  GrantAuthRequest,
  GrantAuthorizationResult,
  GroftyClient,
  GroftyMode,
  RequestAuthorizationArgs,
  TransactResult,
}

export type DeskAuthPurpose =
  | typeof PURPOSE_LOCK
  | typeof PURPOSE_DISBURSE
  | typeof PURPOSE_ADD_COLLATERAL
  | typeof PURPOSE_REPAY
  | typeof PURPOSE_LIQUIDATE
  | typeof PURPOSE_GOVERNED_CUSTODY_RELEASE

export type AuthRole = 'BorrowerRole' | 'LenderRole' | 'LiquidatorRole'

export function purposeForChoice(
  choice: 'Lock' | 'Disburse' | 'Repay' | 'Liquidate',
): DeskAuthPurpose {
  switch (choice) {
    case 'Lock':
      return PURPOSE_LOCK
    case 'Disburse':
      return PURPOSE_DISBURSE
    case 'Repay':
      return PURPOSE_REPAY
    case 'Liquidate':
      return PURPOSE_LIQUIDATE
  }
}

/** Factory used by deskApi — mock (default) or live CIP-103. */
export function createBrowserGroftyClient(
  authorityParty: string,
  mode: GroftyMode = 'mock',
  opts?: { remoteGatewayRpcUrl?: string },
): GroftyClient {
  return createGroftyClient({
    mode,
    mockAuthorityParty: authorityParty,
    remoteGatewayRpcUrl: opts?.remoteGatewayRpcUrl,
  })
}

/**
 * Prove RequestAuthorization → Grant against the active client.
 * Mock: fully offline. Live: prepareExecute / prepareExecuteAndWait when provider present.
 */
export async function proveRequestThenGrant(
  client: GroftyClient,
  opts: {
    request: RequestAuthorizationArgs
    /** When false, build the RequestAuthorization command without submitting. */
    submitRequest?: boolean
    /** When set, exercises Grant via prepareExecuteAndWait (live) or mock grant. */
    grant?: GrantAuthRequest
  },
): Promise<{
  requestCommand: unknown
  requestResult?: TransactResult
  grantPayload?: AuthorizationGrantedPayload
  grantResult?: TransactResult
}> {
  const req = await client.requestAuthorization(opts.request, {
    submit: opts.submitRequest ?? true,
  })
  if (!opts.grant) {
    return { requestCommand: req.command, requestResult: req.result }
  }
  const g = await client.grantAuthorization(opts.grant)
  return {
    requestCommand: req.command,
    requestResult: req.result,
    grantPayload: g.payload,
    grantResult: g.result,
  }
}
