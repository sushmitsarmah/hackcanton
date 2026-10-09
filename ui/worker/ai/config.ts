/**
 * Server-side configuration for the assistant, resolved from Worker env
 * bindings (see worker/env.ts) — never from user input. Unset `AI_PROVIDER`
 * means the assistant is off: callers must handle null. A value that is present
 * but malformed throws loudly.
 */
import type { ProviderKey } from './types.ts'

export interface AiEnv {
  AI_PROVIDER?: string
  AI_MODEL?: string
  AI_BASE_URL?: string
  AI_API_KEY?: string
  AI_TEMPERATURE?: string
  AI_MAX_TOKENS?: string
  OLLAMA_BASE_URL?: string
  OLLAMA_API_KEY?: string
  OPENROUTER_API_KEY?: string
  CLOUDFLARE_API_TOKEN?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  [key: string]: unknown
}

export interface AiConfig {
  provider: ProviderKey
  model: string
  apiKey: string | null
  baseUrl: string | null
  temperature: number | null
  maxTokens: number | null
}

export const PROVIDER_KEYS: readonly ProviderKey[] = [
  'openrouter',
  'cloudflare',
  'ollama-cloud',
  'ollama',
  'openai-compatible',
] as const

/** Providers that require an API key. Local Ollama and a local endpoint do not. */
const NEEDS_KEY: Record<ProviderKey, boolean> = {
  openrouter: true,
  cloudflare: true,
  'ollama-cloud': true,
  ollama: false,
  'openai-compatible': false,
}

export const DEFAULT_MODEL: Record<ProviderKey, string> = {
  openrouter: 'openai/gpt-4o-mini',
  cloudflare: '@cf/qwen/qwen3-30b-a3b-fp8',
  'ollama-cloud': 'gpt-oss:120b',
  ollama: 'llama3.1',
  'openai-compatible': 'default',
}

const KEY_VAR: Record<ProviderKey, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  cloudflare: 'CLOUDFLARE_API_TOKEN',
  'ollama-cloud': 'OLLAMA_API_KEY',
  ollama: 'OLLAMA_BASE_URL',
  'openai-compatible': 'AI_API_KEY',
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

/**
 * Read the assistant configuration. Returns null when no provider is set.
 * Throws on an unknown provider, a missing key, or a malformed number/URL.
 */
export function aiConfig(env: AiEnv & { AI?: unknown } = {}): AiConfig | null {
  // A native Workers AI binding is enough on its own — no key, no AI_PROVIDER.
  const rawProvider = str(env.AI_PROVIDER)?.trim() || (env.AI ? 'cloudflare' : '')
  if (!rawProvider) return null
  if (!(PROVIDER_KEYS as readonly string[]).includes(rawProvider)) {
    throw new Error(`AI_PROVIDER must be one of ${PROVIDER_KEYS.join(', ')}.`)
  }
  const provider = rawProvider as ProviderKey

  const apiKey = resolveApiKey(provider, env)
  // The native Workers AI binding satisfies Cloudflare without a key.
  const bindingCoversCloudflare = provider === 'cloudflare' && Boolean(env.AI)
  if (NEEDS_KEY[provider] && !apiKey && !bindingCoversCloudflare) {
    throw new Error(`${KEY_VAR[provider]} is required when AI_PROVIDER is "${provider}".`)
  }

  return {
    provider,
    model: str(env.AI_MODEL)?.trim() || DEFAULT_MODEL[provider],
    apiKey,
    baseUrl: readBaseUrl(provider, env),
    temperature: readNumber(str(env.AI_TEMPERATURE), 'AI_TEMPERATURE', { min: 0, max: 2 }),
    maxTokens: readNumber(str(env.AI_MAX_TOKENS), 'AI_MAX_TOKENS', { min: 1 }),
  }
}

/**
 * Whether a provider is usable in this environment: it either needs no key
 * (local Ollama / local endpoint), has its key/endpoint present, or — for
 * Cloudflare — the native binding is available.
 */
export function providerUsable(provider: ProviderKey, env: AiEnv & { AI?: unknown }): boolean {
  try {
    return aiConfig({ ...env, AI_PROVIDER: provider }) !== null
  } catch {
    return false
  }
}

/** Every provider this deployment can actually reach. */
export function availableProviders(env: AiEnv & { AI?: unknown }): ProviderKey[] {
  return PROVIDER_KEYS.filter((key) => providerUsable(key, env))
}

/** Whether the assistant is configured. Never throws. */
export function assistantConfigured(env: AiEnv & { AI?: unknown } = {}): boolean {
  try {
    return aiConfig(env) !== null
  } catch {
    return Boolean(str(env.AI_PROVIDER)?.trim()) || Boolean(env.AI)
  }
}

function resolveApiKey(provider: ProviderKey, env: AiEnv): string | null {
  const specific =
    provider === 'openrouter'
      ? str(env.OPENROUTER_API_KEY)
      : provider === 'cloudflare'
        ? str(env.CLOUDFLARE_API_TOKEN)
        : provider === 'ollama-cloud'
          ? str(env.OLLAMA_API_KEY)
          : undefined
  return (specific ?? str(env.AI_API_KEY))?.trim() || null
}

/** Cloudflare Workers AI's OpenAI-compatible endpoint, from the account id. */
export function cloudflareBaseUrl(accountId: string | undefined): string | null {
  const id = accountId?.trim()
  if (!id) return null
  return `https://api.cloudflare.com/client/v4/accounts/${id}/ai/v1`
}

function readBaseUrl(provider: ProviderKey, env: AiEnv & { AI?: unknown }): string | null {
  // The native Workers AI binding needs no base URL at all.
  if (provider === 'cloudflare' && env.AI) return null
  if (provider === 'cloudflare' && !str(env.AI_BASE_URL)?.trim()) {
    const derived = cloudflareBaseUrl(str(env.CLOUDFLARE_ACCOUNT_ID))
    if (!derived) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID is required when AI_PROVIDER is "cloudflare".')
    }
    return derived
  }
  const raw =
    provider === 'ollama' || provider === 'ollama-cloud'
      ? str(env.OLLAMA_BASE_URL) ?? str(env.AI_BASE_URL)
      : str(env.AI_BASE_URL) ?? str(env.OLLAMA_BASE_URL)
  const trimmed = raw?.trim()
  if (!trimmed) return null
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('AI_BASE_URL must be a valid URL.')
  }
  const local = provider === 'ollama' || provider === 'openai-compatible'
  if (!local && url.protocol !== 'https:') {
    throw new Error('AI_BASE_URL must be https:// for a hosted provider.')
  }
  if (url.username !== '' || url.password !== '') {
    throw new Error('AI_BASE_URL must not embed credentials in the URL.')
  }
  return trimmed.replace(/\/+$/, '')
}

function readNumber(
  value: string | undefined,
  name: string,
  bounds: { min: number; max?: number },
): number | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (
    !Number.isFinite(parsed) ||
    parsed < bounds.min ||
    (bounds.max !== undefined && parsed > bounds.max)
  ) {
    throw new Error(
      `${name} must be a number ${bounds.max !== undefined ? `between ${bounds.min} and ${bounds.max}` : `at least ${bounds.min}`}.`,
    )
  }
  return parsed
}
