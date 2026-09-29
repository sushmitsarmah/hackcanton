import type { DecManClientConfig, DecManMode } from './types.js'

function env(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() !== '' ? v.trim() : undefined
}

export function resolveDecManMode(
  override?: DecManMode,
): DecManMode {
  if (override) return override
  const raw = (env('DECMAN_MODE') ?? 'scaffold').toLowerCase()
  if (raw === 'http') return 'http'
  return 'scaffold'
}

export function loadDecManConfig(
  overrides: Partial<DecManClientConfig> = {},
): DecManClientConfig {
  const mode = resolveDecManMode(overrides.mode)
  return {
    mode,
    baseUrl: overrides.baseUrl ?? env('DECMAN_URL'),
    token: overrides.token ?? env('DECMAN_TOKEN'),
    deskPartyId: overrides.deskPartyId ?? env('DECMAN_DESK_PARTY_ID'),
    evidencePrefix:
      overrides.evidencePrefix ?? env('DECMAN_EVIDENCE_PREFIX') ?? 'desk',
    adminRole: overrides.adminRole ?? env('DECMAN_ADMIN_ROLE'),
  }
}
