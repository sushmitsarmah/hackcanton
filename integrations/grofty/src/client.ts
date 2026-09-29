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

export function createGroftyClient(
  config: GroftyClientConfig = {},
): GroftyClient {
  const mode = resolveGroftyMode(config.mode)
  if (mode === 'live') {
    return new LiveGroftyClient({ ...config, mode })
  }
  return new MockGroftyClient({ ...config, mode })
}
