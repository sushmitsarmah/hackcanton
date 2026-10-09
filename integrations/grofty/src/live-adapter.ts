import {
  buildAuthorizationGrantedCreate,
  buildAuthorizationProposalCreate,
  buildGrantExercise,
  buildRequestAuthorizationCreate,
  DEFAULT_AUTH_MODULE,
} from './commands.js'
import {
  GROFTY_EXTENSION_ID,
  GroftyConnectFailedError,
  GroftyExtensionMissingError,
  GroftyNotInBrowserError,
} from './errors.js'
import { newCorrelationId } from './id.js'
import type {
  AuthorizationGrantedArgs,
  AuthorizationGrantedPayload,
  AuthorizationProposalArgs,
  ConnectResult,
  ConnectedAccount,
  GrantAuthRequest,
  GrantAuthorizationResult,
  GroftyClient,
  GroftyClientConfig,
  RequestAuthorizationArgs,
  TransactResult,
} from './types.js'

export const GROFTY_PROVIDER_ID = `browser:ext:${GROFTY_EXTENSION_ID}`

const CANTON_ANNOUNCE_PROVIDER_EVENT = 'canton:announceProvider'
const CANTON_REQUEST_PROVIDER_EVENT = 'canton:requestProvider'

// Splice postMessage handshake used by the reference extension adapter
// (@canton-network/dapp-sdk ExtensionAdapter.detect).
const SPLICE_WALLET_EXT_READY = 'SPLICE_WALLET_EXT_READY'
const SPLICE_WALLET_EXT_ACK = 'SPLICE_WALLET_EXT_ACK'

/** Minimal surface we need from @canton-network/dapp-sdk (CIP-0103). */
type LedgerApiParams = {
  requestMethod: 'get' | 'post' | 'patch' | 'put' | 'delete'
  resource: string
  body?: unknown
  query?: Record<string, unknown>
  path?: Record<string, unknown>
}
type DappSdkModule = {
  connect: (opts?: { additionalAdapters?: unknown[] }) => Promise<{ isConnected?: boolean }>
  disconnect: () => Promise<void> | void
  status: () => Promise<unknown>
  listAccounts: () => Promise<unknown>
  prepareExecute: (params: {
    commands: unknown[]
    actAs?: string[]
  }) => Promise<unknown>
  prepareExecuteAndWait: (params: {
    commands: unknown[]
    actAs?: string[]
  }) => Promise<{
    tx?: { commandId?: string; payload?: { updateId?: string } }
  }>
  ledgerApi: (params: LedgerApiParams) => Promise<unknown>
  RemoteAdapter: new (config: { name: string; rpcUrl: string }) => unknown
  ExtensionAdapter: new (config?: {
    providerId?: string
    name?: string
    icon?: string
    description?: string
    target?: string
  }) => unknown
  DiscoveryClient?: new (config?: unknown) => {
    discover?: () => Promise<unknown[]>
  }
}

/** Reject after `ms` so a wallet call that never resolves cannot hang the UI. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${Math.round(ms / 1000)}s (no response from wallet)`)),
      ms,
    )
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

/** Stringify unknown error shapes (SDK throws plain objects, not Error). */
function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    const s = JSON.stringify(err)
    if (s && s !== '{}') return s
  } catch {
    /* fall through */
  }
  return String(err)
}

/** Default JSON Ledger API v2 resources for ACS discovery. */
const DEFAULT_ACTIVE_CONTRACTS_RESOURCE = '/v2/state/active-contracts'
const DEFAULT_LEDGER_END_RESOURCE = '/v2/state/ledger-end'

/**
 * Probe whether any CIP-103 wallet has announced (incl. Grofty extension).
 * Best-effort — false negatives possible if the extension is slow to inject.
 */
export type AnnouncedProvider = {
  id: string
  name: string
  icon?: string
  target?: string
}

/**
 * Discover CIP-103 wallets via the vendor-neutral announce protocol
 * (CANTON_REQUEST_PROVIDER_EVENT -> CANTON_ANNOUNCE_PROVIDER_EVENT).
 *
 * This mirrors @canton-network/dapp-sdk's requestAnnouncedProviders: it only
 * trusts well-formed announces (id + name) from event.detail. Best-effort —
 * false negatives possible if the extension is slow to inject.
 */
export async function requestAnnouncedProviders(
  timeoutMs = 1200,
): Promise<AnnouncedProvider[]> {
  if (typeof window === 'undefined') return []
  const discovered = new Map<string, AnnouncedProvider>()
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as
      | { id?: unknown; name?: unknown; icon?: unknown; target?: unknown }
      | undefined
    if (!detail || typeof detail.id !== 'string' || typeof detail.name !== 'string') {
      return
    }
    if (discovered.has(detail.id)) return
    discovered.set(detail.id, {
      id: detail.id,
      name: detail.name,
      icon: typeof detail.icon === 'string' ? detail.icon : undefined,
      target: typeof detail.target === 'string' ? detail.target : undefined,
    })
  }
  window.addEventListener(CANTON_ANNOUNCE_PROVIDER_EVENT, handler)
  try {
    window.dispatchEvent(new CustomEvent(CANTON_REQUEST_PROVIDER_EVENT, { detail: {} }))
    await new Promise((resolve) => setTimeout(resolve, timeoutMs))
  } finally {
    window.removeEventListener(CANTON_ANNOUNCE_PROVIDER_EVENT, handler)
  }
  return Array.from(discovered.values())
}

/**
 * Splice postMessage handshake: post SPLICE_WALLET_EXT_READY and wait for
 * SPLICE_WALLET_EXT_ACK. This is what the reference ExtensionAdapter uses and
 * is the protocol Grofty's Firefox/Chrome extension speaks.
 */
export async function detectSpliceExtension(
  timeoutMs = 1200,
): Promise<{ present: boolean; detail: string }> {
  if (typeof window === 'undefined') return { present: false, detail: 'no window' }
  const w = window as Window & { canton?: unknown }
  if (w.canton != null) {
    return { present: true, detail: 'window.canton present' }
  }
  return await new Promise((resolve) => {
    let settled = false
    const done = (present: boolean, detail: string) => {
      if (settled) return
      settled = true
      window.removeEventListener('message', handler)
      resolve({ present, detail })
    }
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string } | undefined
      if (data?.type === SPLICE_WALLET_EXT_ACK) {
        done(true, 'SPLICE_WALLET_EXT_ACK (postMessage handshake)')
      }
    }
    window.addEventListener('message', handler)
    try {
      window.postMessage({ type: SPLICE_WALLET_EXT_READY }, '*')
    } catch {
      /* ignore */
    }
    setTimeout(
      () => done(false, `no SPLICE_WALLET_EXT_ACK within ${timeoutMs}ms`),
      timeoutMs,
    )
  })
}

export async function detectCip103Provider(
  timeoutMs = 1200,
): Promise<{ present: boolean; detail: string }> {
  if (typeof window === 'undefined') {
    return { present: false, detail: 'no window' }
  }
  // Try both discovery mechanisms: the EIP-6963-style CustomEvent announce and
  // the Splice postMessage handshake. Either indicates a CIP-103 provider.
  const [announce, splice] = await Promise.all([
    requestAnnouncedProviders(timeoutMs),
    detectSpliceExtension(timeoutMs),
  ])
  if (announce.length > 0) {
    const names = announce.map((p) => p.name || p.id).join(', ')
    const grofty = announce.find((p) =>
      p.id.toLowerCase().includes(GROFTY_EXTENSION_ID.toLowerCase()),
    )
    return {
      present: true,
      detail: grofty
        ? `Grofty announced (${names})`
        : `CIP-103 provider(s) announced: ${names}`,
    }
  }
  if (splice.present) {
    return { present: true, detail: splice.detail }
  }
  return {
    present: false,
    detail: `${splice.detail}; no CIP-103 announce within ${timeoutMs}ms (extension id ${GROFTY_EXTENSION_ID})`,
  }
}

/**
 * Live CIP-103 client via @canton-network/dapp-sdk.
 * Targets Grofty browser extension when announced; optional RemoteAdapter gateway.
 *
 * Blockers for MainNet:
 * - Grofty whitelist onboarding (https://grofty.cc/docs/quick-start)
 * - Extension must inject / announce CIP-103 (canton:announceProvider)
 * - User Party ID must match Desk.Auth subject / authority as designed
 * - Desk DAR uploaded to the synchronizer the wallet targets
 */
export class LiveGroftyClient implements GroftyClient {
  readonly mode = 'live' as const
  private sdk: DappSdkModule | null = null
  private connected = false
  private readonly authModuleId: string
  private readonly remoteGatewayRpcUrl?: string
  private readonly preferredProviderId: string
  private readonly activeContractsResource: string

  constructor(config: GroftyClientConfig = {}) {
    this.authModuleId = config.authModuleId ?? DEFAULT_AUTH_MODULE
    this.remoteGatewayRpcUrl = config.remoteGatewayRpcUrl
    this.preferredProviderId =
      config.preferredProviderId ?? GROFTY_PROVIDER_ID
    this.activeContractsResource =
      config.activeContractsResource ?? DEFAULT_ACTIVE_CONTRACTS_RESOURCE
  }

  private async loadSdk(): Promise<DappSdkModule> {
    if (this.sdk) return this.sdk
    if (typeof window === 'undefined') {
      throw new GroftyNotInBrowserError()
    }
    try {
      const mod = (await import('@canton-network/dapp-sdk')) as unknown as DappSdkModule
      this.sdk = mod
      return mod
    } catch (err) {
      throw new GroftyConnectFailedError(
        `failed to load @canton-network/dapp-sdk: ${
          stringifyError(err)
        }`,
      )
    }
  }

  private async connectOptions(): Promise<{
    additionalAdapters: unknown[]
  }> {
    const sdk = await this.loadSdk()
    const additionalAdapters: unknown[] = []
    // Register the browser extension adapter explicitly. The SDK only
    // auto-registers announced extensions; some builds (e.g. Firefox loaded
    // via about:debugging) speak the postMessage handshake but never emit the
    // canton:announceProvider CustomEvent, so we add it ourselves.
    if (typeof sdk.ExtensionAdapter === 'function') {
      additionalAdapters.push(
        new sdk.ExtensionAdapter({
          providerId: this.preferredProviderId,
          name: 'Grofty Wallet (CIP-103)',
          description: 'Grofty browser extension',
        }),
      )
    }
    if (this.remoteGatewayRpcUrl) {
      additionalAdapters.push(
        new sdk.RemoteAdapter({
          name: 'Canton CIP-103 Gateway',
          rpcUrl: this.remoteGatewayRpcUrl,
        }),
      )
    }
    return { additionalAdapters }
  }

  /**
   * Pre-flight: extension / CIP-103 presence. Throws GroftyExtensionMissingError
   * when neither extension announce nor remote gateway is configured.
   */
  /**
   * Best-effort probe. Returns a detail string; never throws, because a missing
   * announce (e.g. some Firefox builds / slow injection) does not mean the SDK
   * cannot connect. connect() relies on the SDK's own discovery and translates
   * a genuine no-wallet error itself.
   */
  async assertProviderAvailable(): Promise<void> {
    if (typeof window === 'undefined') throw new GroftyNotInBrowserError()
    // No hard block on missing announce. Intentionally a no-op beyond the
    // browser check; use detectCip103Provider() from the UI Probe button for a
    // human-readable presence report.
  }

  async connect(): Promise<ConnectResult> {
    await this.assertProviderAvailable()
    const sdk = await this.loadSdk()
    const opts = await this.connectOptions()
    try {
      const result = opts ? await sdk.connect(opts) : await sdk.connect()
      this.connected = Boolean(result?.isConnected ?? true)
    } catch (err) {
      const msg = stringifyError(err)
      // Common: user closed picker / no wallets detected by dapp-sdk
      if (
        /no wallet|no provider|not found|cancelled|canceled|user reject/i.test(
          msg,
        )
      ) {
        throw new GroftyExtensionMissingError(msg)
      }
      throw new GroftyConnectFailedError(msg)
    }
    const accounts = await this.listAccounts()
    return {
      mode: 'live',
      isConnected: this.connected,
      accounts,
      providerLabel: `CIP-103 (preferred ${this.preferredProviderId})`,
    }
  }

  async disconnect(): Promise<void> {
    const sdk = await this.loadSdk()
    await sdk.disconnect()
    this.connected = false
  }

  async listAccounts(): Promise<ConnectedAccount[]> {
    const sdk = await this.loadSdk()
    const accounts = await sdk.listAccounts()
    const list = Array.isArray(accounts)
      ? accounts
      : ((accounts as { accounts?: unknown })?.accounts ??
        (accounts as { result?: unknown })?.result ??
        [])
    return (
      list as Array<{ partyId?: string; party?: string; hint?: string }>
    )
      .map((a) => ({
        partyId: String(a.partyId ?? a.party ?? ''),
        hint: a.hint,
      }))
      .filter((a) => a.partyId)
  }

  /** Announced CIP-103 providers (Grofty when its extension id is present). */
  async discoverProviders(timeoutMs = 1200): Promise<AnnouncedProvider[]> {
    return await requestAnnouncedProviders(timeoutMs)
  }

  /**
   * Grofty can only submit as the connected party. Guarantee that party is the
   * expected authority so a mistaken config fails clearly instead of opaquely.
   */
  private async assertConnectedPartyIs(expected: string): Promise<void> {
    const accounts = await this.listAccounts()
    if (accounts.length === 0) return // let the wallet surface its own error
    const matches = accounts.some((a) => a.partyId === expected)
    if (!matches) {
      const actual = accounts.map((a) => a.partyId).join(', ')
      throw new GroftyConnectFailedError(
        `Connected Grofty party does not match the configured authority. ` +
          `Expected ${expected}, connected as: ${actual}. ` +
          `Set VITE_GROFTY_AUTHORITY_PARTY to the wallet party (Grofty cannot actAs another party).`,
      )
    }
  }

  /** Wallet network + participant info (exposes the Ledger API URL to upload to). */
  async getNetworkInfo(): Promise<{
    networkId?: string
    ledgerApi?: string
    userId?: string
    connected: boolean
  }> {
    const sdk = await this.loadSdk()
    try {
      const status = (await withTimeout(sdk.status(), 8_000)) as {
        network?: { networkId?: string; ledgerApi?: string }
        session?: { userId?: string }
        connection?: { isConnected?: boolean }
      }
      return {
        networkId: status.network?.networkId,
        ledgerApi: status.network?.ledgerApi,
        userId: status.session?.userId,
        connected: Boolean(status.connection?.isConnected),
      }
    } catch {
      return { connected: this.connected }
    }
  }

  /**
   * Upload the Desk DAR to the wallet's participant via the CIP-103 ledgerApi
   * proxy (POST /v2/dars). Requires the connected user to have upload rights.
   *
   * The CIP-103 ledgerApi proxy is built for JSON queries; a binary DAR upload is
   * not part of the standard dApp surface, so this commonly never resolves (the
   * extension opens an approval it cannot complete). We bound it with a timeout so
   * the UI never hangs, and return the Ledger API URL to upload to via CLI.
   */
  /**
   * A CIP-103 wallet cannot upload a DAR: it exposes only wallets, balance,
   * /v2/state/ledger-end, /v2/state/active-contracts, /v2/updates/update-by-id and
   * /v2/events/events-by-contract-id — no /v2/dars. So this does not attempt the
   * call; it returns the exact guidance for an operator with participant admin.
   */
  async uploadDar(
    _darBase64?: string,
  ): Promise<{ ok: boolean; detail: string; ledgerApi?: string }> {
    const net = await this.getNetworkInfo().catch(() => ({ connected: false }) as const)
    return {
      ok: false,
      detail:
        'The Grofty (CIP-103) wallet cannot upload a DAR — it exposes no /v2/dars resource. Upload the DAR with the participant admin CLI or admin UI instead.',
      ledgerApi: 'ledgerApi' in net ? net.ledgerApi : undefined,
    }
  }

  /**
   * Best-effort check whether the Desk package is visible on the wallet's
   * participant. The CIP-103 wallet only exposes a small set of Ledger API
   * resources (wallets, balance, /v2/state/ledger-end, /v2/state/active-contracts,
   * /v2/updates/update-by-id, /v2/events/events-by-contract-id) — there is no
   * /v2/packages. So we look for the package id within active-contract template
   * ids instead. Absence is not proof it is un-uploaded (no Desk contract exists
   * until one is created), so this reports reachability plus a soft signal.
   */
  async checkDeskPackage(
    packageName = 'cbtc-collateral-desk',
  ): Promise<{
    reachable: boolean
    present: boolean
    packageIds: string[]
    detail: string
  }> {
    const sdk = await this.loadSdk()
    // Bound the whole operation: connect() opens a wallet popup that can hang.
    try {
      return await withTimeout(
        (async () => {
          if (!this.connected) await this.connect()
          const offset = await this.fetchLedgerEnd()
          if (offset == null) {
            return {
              reachable: false,
              present: false,
              packageIds: [],
              detail: 'wallet did not expose /v2/state/ledger-end',
            }
          }
          const raw = await sdk.ledgerApi({
            requestMethod: 'post',
            resource: this.activeContractsResource,
            body: {
              activeAtOffset: offset,
              eventFormat: {
                filtersByParty: {
                  '*': {
                    cumulative: [
                      { identifierFilter: { WildcardFilter: { value: {} } } },
                    ],
                  },
                },
                verbose: true,
              },
            },
          })
          const seen = collectTemplatePackages(raw)
          const present = seen.some((p) => p.toLowerCase().startsWith(packageName))
          return {
            reachable: true,
            present,
            packageIds: seen,
            detail: present
              ? `A ${packageName} contract is visible on the wallet participant`
              : seen.length
                ? `${packageName} not seen among ${seen.length} active-contract package(s) (may still be uploaded with no contract yet)`
                : 'no active contracts visible via the wallet (package may still be uploaded; cannot verify)',
          }
        })(),
        20_000,
      )
    } catch (err) {
      return {
        reachable: false,
        present: false,
        packageIds: [],
        detail: `could not read active contracts via wallet: ${stringifyError(err)}`,
      }
    }
  }

  /** Current ledger end offset via the wallet's JSON Ledger API, or null. */
  private async fetchLedgerEnd(): Promise<number | null> {
    const sdk = await this.loadSdk()
    try {
      const raw = await withTimeout(
        sdk.ledgerApi({
          requestMethod: 'get',
          resource: DEFAULT_LEDGER_END_RESOURCE,
        }),
        15_000,
      )
      const o = raw as { offset?: unknown; result?: { offset?: unknown } } | null
      const offset = o?.offset ?? o?.result?.offset
      if (typeof offset === 'number') return offset
      if (typeof offset === 'string' && /^\d+$/.test(offset)) return Number(offset)
      return null
    } catch {
      return null
    }
  }

  /**
   * Query the JSON Ledger API through the CIP-103 wallet for active
   * AuthorizationGranted contracts matching subject/role/purpose.
   *
   * prepareExecuteAndWait only returns {tx:{commandId,payload:{updateId}}} with
   * no contract id, so this is how we recover the real evidence cid. The wallet
   * must be authorized to see the contract (authority is an observer).
   *
   * Returns cids newest-first; empty when the resource/route is unavailable.
   */
  async fetchAuthorizationGrantedCids(
    match: { authority: string; subject: string; role: string; purpose: string },
  ): Promise<string[]> {
    const sdk = await this.loadSdk()
    if (!this.connected) await this.connect()
    const offset = await this.fetchLedgerEnd()
    if (offset == null) return []
    let raw: unknown
    try {
      raw = await sdk.ledgerApi({
        requestMethod: 'post',
        resource: this.activeContractsResource,
        body: {
          activeAtOffset: offset,
          eventFormat: {
            filtersByParty: {
              [match.authority]: {
                cumulative: [
                  {
                    identifierFilter: {
                      WildcardFilter: { value: { includeCreatedEventBlob: false } },
                    },
                  },
                ],
              },
            },
            verbose: true,
          },
        },
      })
    } catch {
      return []
    }
    const entries = extractActiveContractEntries(raw)
    const out: string[] = []
    for (const entry of entries) {
      const args = (entry as {
        contractEntry?: { activeContract?: { createdEvent?: { createArgument?: Record<string, unknown> } } }
        activeContract?: { createdEvent?: { createArgument?: Record<string, unknown> } }
      })
      const createArgument =
        args?.contractEntry?.activeContract?.createdEvent?.createArgument ??
        args?.activeContract?.createdEvent?.createArgument
      if (!createArgument) continue
      const cid =
        (entry as { contractEntry?: { activeContract?: { createdEvent?: { contractId?: string } } } })
          ?.contractEntry?.activeContract?.createdEvent?.contractId ??
        (entry as { activeContract?: { createdEvent?: { contractId?: string } } })
          ?.activeContract?.createdEvent?.contractId
      if (!cid) continue
      const a = createArgument as {
        subject?: unknown
        role?: unknown
        purpose?: unknown
      }
      if (
        String(a.subject ?? '') === match.subject &&
        String(a.role ?? '') === match.role &&
        String(a.purpose ?? '') === match.purpose
      ) {
        out.push(cid)
      }
    }
    return out
  }

  /**
   * Live primary path: the authority wallet creates AuthorizationGranted
   * directly (signatory = authority, Desk.Auth:93), then we discover the cid
   * via ACS. No CreditOfficer proposal round-trip is required.
   */
  async createGrant(
    args: AuthorizationGrantedArgs,
    opts?: { submit?: boolean },
  ): Promise<GrantAuthorizationResult> {
    const command = buildAuthorizationGrantedCreate(
      args,
      `${this.authModuleId}:AuthorizationGranted`,
    )
    const payload: AuthorizationGrantedPayload = {
      authority: args.authority,
      subject: args.subject,
      role: args.role,
      purpose: args.purpose,
      mode: 'live',
    }
    if (opts?.submit === false) {
      return { payload }
    }
    const sdk = await this.loadSdk()
    if (!this.connected) await this.connect()
    await this.assertConnectedPartyIs(args.authority)
    let updateId: string | undefined
    try {
      // Grofty submits only as the connected party's own party (actAs is
      // rejected with code 4200). The connected wallet party must therefore be
      // args.authority — which it is for this desk. Omit actAs.
      const res = await sdk.prepareExecuteAndWait({ commands: [command] })
      updateId = res?.tx?.payload?.updateId
    } catch (err) {
      throw new GroftyConnectFailedError(
        `prepareExecuteAndWait(AuthorizationGranted create) failed: ${
          stringifyError(err)
        }`,
      )
    }
    const correlationId = newCorrelationId('live-grant')
    const cids = await this.fetchAuthorizationGrantedCids(args)
    const contractId = cids[cids.length - 1]
    const result: TransactResult = {
      mode: 'live',
      submitted: true,
      waited: updateId != null,
      updateId,
      correlationId,
      raw: { updateId },
    }
    return {
      payload: { ...payload, correlationId, contractId },
      result,
      contractId,
      updateId,
    }
  }

  async requestAuthorization(
    args: RequestAuthorizationArgs,
    opts?: { submit?: boolean; templateId?: string },
  ) {
    const templateId =
      opts?.templateId ?? `${this.authModuleId}:RequestAuthorization`
    const command = buildRequestAuthorizationCreate(args, templateId)
    if (opts?.submit === false) {
      return { command }
    }
    const sdk = await this.loadSdk()
    if (!this.connected) await this.connect()
    try {
      const raw = await sdk.prepareExecute({ commands: [command] })
      // prepareExecute only requests the wallet to sign/submit; it returns null
      // and does not confirm ledger settlement. Mark waited=false accordingly.
      const result: TransactResult = {
        mode: 'live',
        submitted: true,
        waited: false,
        correlationId: newCorrelationId('live-req'),
        raw,
      }
      return { command, result }
    } catch (err) {
      throw new GroftyConnectFailedError(
        `prepareExecute(RequestAuthorization) failed: ${
          stringifyError(err)
        }`,
      )
    }
  }

  async grantAuthorization(
    req: GrantAuthRequest,
    opts?: { submit?: boolean },
  ): Promise<GrantAuthorizationResult> {
    const templateId =
      req.proposalTemplateId ?? `${this.authModuleId}:AuthorizationProposal`
    const command = buildGrantExercise(req.proposalContractId, templateId)
    const payload: AuthorizationGrantedPayload = {
      authority: req.args.authority,
      subject: req.args.subject,
      role: req.args.role,
      purpose: req.args.purpose,
      mode: 'live',
    }
    if (opts?.submit === false) {
      return { payload }
    }
    const sdk = await this.loadSdk()
    if (!this.connected) await this.connect()
    let updateId: string | undefined
    try {
      // Grofty rejects actAs (code 4200); it submits only as the connected
      // party, so the wallet party must be the proposal's authority.
      const res = await sdk.prepareExecuteAndWait({ commands: [command] })
      updateId = res?.tx?.payload?.updateId
    } catch (err) {
      throw new GroftyConnectFailedError(
        `prepareExecuteAndWait(Grant) failed: ${
          stringifyError(err)
        }`,
      )
    }
    const correlationId = newCorrelationId('live-grant')
    const cids = await this.fetchAuthorizationGrantedCids(req.args)
    const contractId = cids[cids.length - 1]
    const result: TransactResult = {
      mode: 'live',
      submitted: true,
      waited: updateId != null,
      updateId,
      correlationId,
      raw: { updateId },
    }
    return {
      payload: { ...payload, correlationId, contractId },
      result,
      contractId,
      updateId,
    }
  }

  /**
   * Live primary path: the connected authority wallet creates AuthorizationGranted
   * directly (signatory = authority per Desk.Auth), then we recover the ledger cid
   * via ACS discovery. Returns evidence carrying the real contract id.
   */
  async authorizeSubject(
    args: AuthorizationProposalArgs,
  ): Promise<AuthorizationGrantedPayload> {
    const { payload, contractId } = await this.createGrant({
      authority: args.authority,
      subject: args.subject,
      role: args.role,
      purpose: args.purpose,
    })
    return contractId ? { ...payload, contractId } : payload
  }

  /**
   * Build (not submit) an AuthorizationProposal create for inspection / backend
   * flows where CreditOfficer proposes and the authority later grants.
   */
  buildProposalCreate(args: AuthorizationProposalArgs) {
    return buildAuthorizationProposalCreate(
      args,
      `${this.authModuleId}:AuthorizationProposal`,
    )
  }

  /**
   * Prove path: RequestAuthorization → (optional) Grant when proposalContractId given.
   * Both go through CIP-103 prepareExecute / prepareExecuteAndWait when provider present.
   */
  async proveRequestThenGrant(opts: {
    request: RequestAuthorizationArgs
    grant?: GrantAuthRequest
  }): Promise<{
    requestCommand: unknown
    requestResult?: TransactResult
    grantPayload?: AuthorizationGrantedPayload
    grantResult?: TransactResult
  }> {
    const req = await this.requestAuthorization(opts.request)
    if (!opts.grant) {
      return {
        requestCommand: req.command,
        requestResult: req.result,
      }
    }
    const g = await this.grantAuthorization(opts.grant)
    return {
      requestCommand: req.command,
      requestResult: req.result,
      grantPayload: g.payload,
      grantResult: g.result,
    }
  }
}

/**
 * Normalize the possible shapes of a JSON Ledger API active-contracts
 * response into a flat entry array. Returns [] for anything unrecognized.
 */
function extractActiveContractEntries(raw: unknown): unknown[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    for (const key of ['activeContracts', 'contracts', 'result', 'data']) {
      if (Array.isArray(o[key])) return o[key] as unknown[]
    }
  }
  return []
}

/** Collect the package-id prefixes from active-contract template ids. */
function collectTemplatePackages(raw: unknown): string[] {
  const entries = extractActiveContractEntries(raw)
  const out = new Set<string>()
  for (const entry of entries) {
    const ev = (entry as {
      contractEntry?: { activeContract?: { createdEvent?: { templateId?: string } } }
      activeContract?: { createdEvent?: { templateId?: string } }
    })
    const templateId =
      ev?.contractEntry?.activeContract?.createdEvent?.templateId ??
      ev?.activeContract?.createdEvent?.templateId
    if (typeof templateId === 'string' && templateId.startsWith('#')) {
      const pkg = templateId.slice(1).split(':')[0]
      if (pkg) out.add(pkg)
    }
  }
  return [...out]
}

