import {
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
  AuthorizationGrantedPayload,
  AuthorizationProposalArgs,
  ConnectResult,
  ConnectedAccount,
  GrantAuthRequest,
  GroftyClient,
  GroftyClientConfig,
  RequestAuthorizationArgs,
  TransactResult,
} from './types.js'

export const GROFTY_PROVIDER_ID = `browser:ext:${GROFTY_EXTENSION_ID}`

/** Minimal surface we need from @canton-network/dapp-sdk (CIP-0103). */
type DappSdkModule = {
  connect: (opts?: { additionalAdapters?: unknown[] }) => Promise<{ isConnected?: boolean }>
  disconnect: () => Promise<void> | void
  listAccounts: () => Promise<unknown>
  prepareExecute: (params: { commands: unknown[] }) => Promise<unknown>
  prepareExecuteAndWait: (params: { commands: unknown[] }) => Promise<unknown>
  RemoteAdapter: new (config: { name: string; rpcUrl: string }) => unknown
  DiscoveryClient?: new (config?: unknown) => {
    discover?: () => Promise<unknown[]>
  }
}

/**
 * Probe whether any CIP-103 wallet has announced (incl. Grofty extension).
 * Best-effort — false negatives possible if the extension is slow to inject.
 */
export async function detectCip103Provider(
  timeoutMs = 1200,
): Promise<{ present: boolean; detail: string }> {
  if (typeof window === 'undefined') {
    return { present: false, detail: 'no window' }
  }
  const w = window as Window & {
    canton?: unknown
    __cantonProviders?: unknown[]
  }
  if (w.canton != null) {
    return { present: true, detail: 'window.canton present' }
  }
  if (Array.isArray(w.__cantonProviders) && w.__cantonProviders.length > 0) {
    return {
      present: true,
      detail: `${w.__cantonProviders.length} announced provider(s)`,
    }
  }

  return await new Promise((resolve) => {
    let settled = false
    const done = (present: boolean, detail: string) => {
      if (settled) return
      settled = true
      window.removeEventListener('canton:announceProvider', onAnnounce as EventListener)
      window.removeEventListener('message', onMessage)
      resolve({ present, detail })
    }
    const onAnnounce = () => done(true, 'canton:announceProvider event')
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as { type?: string } | undefined
      if (
        data &&
        typeof data.type === 'string' &&
        data.type.toLowerCase().includes('announce')
      ) {
        done(true, `message:${data.type}`)
      }
    }
    window.addEventListener('canton:announceProvider', onAnnounce as EventListener)
    window.addEventListener('message', onMessage)
    try {
      window.dispatchEvent(
        new CustomEvent('canton:requestProvider', { detail: {} }),
      )
    } catch {
      /* ignore */
    }
    setTimeout(
      () =>
        done(
          false,
          `no CIP-103 announce within ${timeoutMs}ms (install Grofty extension id ${GROFTY_EXTENSION_ID})`,
        ),
      timeoutMs,
    )
  })
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

  constructor(config: GroftyClientConfig = {}) {
    this.authModuleId = config.authModuleId ?? DEFAULT_AUTH_MODULE
    this.remoteGatewayRpcUrl = config.remoteGatewayRpcUrl
    this.preferredProviderId =
      config.preferredProviderId ?? GROFTY_PROVIDER_ID
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
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  private async connectOptions(): Promise<
    { additionalAdapters: unknown[] } | undefined
  > {
    const sdk = await this.loadSdk()
    if (!this.remoteGatewayRpcUrl) return undefined
    return {
      additionalAdapters: [
        new sdk.RemoteAdapter({
          name: 'Canton CIP-103 Gateway',
          rpcUrl: this.remoteGatewayRpcUrl,
        }),
      ],
    }
  }

  /**
   * Pre-flight: extension / CIP-103 presence. Throws GroftyExtensionMissingError
   * when neither extension announce nor remote gateway is configured.
   */
  async assertProviderAvailable(): Promise<void> {
    if (typeof window === 'undefined') throw new GroftyNotInBrowserError()
    if (this.remoteGatewayRpcUrl) return
    const probe = await detectCip103Provider()
    if (!probe.present) {
      throw new GroftyExtensionMissingError(probe.detail)
    }
  }

  async connect(): Promise<ConnectResult> {
    await this.assertProviderAvailable()
    const sdk = await this.loadSdk()
    const opts = await this.connectOptions()
    try {
      const result = opts ? await sdk.connect(opts) : await sdk.connect()
      this.connected = Boolean(result?.isConnected ?? true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
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
      const result: TransactResult = {
        mode: 'live',
        submitted: true,
        correlationId: newCorrelationId('live-req'),
        raw,
      }
      return { command, result }
    } catch (err) {
      throw new GroftyConnectFailedError(
        `prepareExecute(RequestAuthorization) failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  async grantAuthorization(
    req: GrantAuthRequest,
    opts?: { submit?: boolean },
  ): Promise<{ payload: AuthorizationGrantedPayload; result?: TransactResult }> {
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
    try {
      const raw = await sdk.prepareExecuteAndWait({ commands: [command] })
      const correlationId = newCorrelationId('live-grant')
      const result: TransactResult = {
        mode: 'live',
        submitted: true,
        correlationId,
        raw,
      }
      return {
        payload: { ...payload, correlationId },
        result,
      }
    } catch (err) {
      throw new GroftyConnectFailedError(
        `prepareExecuteAndWait(Grant) failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  /**
   * Live convenience: create AuthorizationProposal via prepareExecute.
   * Grant still needs the new proposal cid from ACS — use grantAuthorization after.
   * For the UI prove panel, prefer requestAuthorization + grantAuthorization with an
   * explicit proposalContractId once the ledger returns it.
   */
  async authorizeSubject(
    args: AuthorizationProposalArgs,
  ): Promise<AuthorizationGrantedPayload> {
    const sdk = await this.loadSdk()
    if (!this.connected) await this.connect()
    const createCmd = buildAuthorizationProposalCreate(
      args,
      `${this.authModuleId}:AuthorizationProposal`,
    )
    try {
      await sdk.prepareExecute({ commands: [createCmd] })
    } catch (err) {
      throw new GroftyConnectFailedError(
        `prepareExecute(AuthorizationProposal) failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
    return {
      authority: args.authority,
      subject: args.subject,
      role: args.role,
      purpose: args.purpose,
      mode: 'live',
      correlationId: newCorrelationId('live-authorize-pending-acs'),
    }
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
