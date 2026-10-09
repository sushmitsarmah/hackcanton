import { LiveGroftyClient } from './live-adapter.js'
import { MockGroftyClient } from './mock-adapter.js'
import type { GroftyClient, GroftyClientConfig, GroftyMode } from './types.js'

type EnvLike = Record<string, string | undefined>

function readEnv(): EnvLike {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as EnvLike
  }
  return {}
}

export function resolveGroftyMode(
  explicit?: GroftyMode,
  env: EnvLike = readEnv(),
): GroftyMode {
  if (explicit) return explicit
  const fromEnv = (env.GROFTY_MODE ?? '').toLowerCase()
  if (fromEnv === 'live' || fromEnv === 'mock') return fromEnv
  // Default: mock in Node; live only when explicitly requested (needs browser + wallet).
  return 'mock'
}

/** Merge documented GROFTY_* env vars as defaults when config omits a field. */
export function configFromEnv(
  config: GroftyClientConfig = {},
  env: EnvLike = readEnv(),
): GroftyClientConfig {
  return {
    mode: config.mode,
    authModuleId: config.authModuleId ?? env.GROFTY_AUTH_MODULE_ID,
    remoteGatewayRpcUrl:
      config.remoteGatewayRpcUrl ?? env.GROFTY_REMOTE_GATEWAY_RPC_URL,
    preferredProviderId:
      config.preferredProviderId ?? env.GROFTY_PREFERRED_PROVIDER_ID,
    mockAuthorityParty:
      config.mockAuthorityParty ?? env.GROFTY_MOCK_AUTHORITY_PARTY,
    activeContractsResource:
      config.activeContractsResource ?? env.GROFTY_ACTIVE_CONTRACTS_RESOURCE,
  }
}

export function createGroftyClient(
  config: GroftyClientConfig = {},
): GroftyClient {
  const merged = configFromEnv(config)
  const mode = resolveGroftyMode(merged.mode)
  if (mode === 'live') {
    return new LiveGroftyClient({ ...merged, mode })
  }
  return new MockGroftyClient({ ...merged, mode })
}
