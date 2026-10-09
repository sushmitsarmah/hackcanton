import { aiConfig, type AiConfig, type AiEnv } from './config.ts'
import type { LlmProvider } from './provider.ts'
import {
  cloudflareProvider,
  ollamaProvider,
  openaiCompatibleProvider,
  openRouterProvider,
} from './providers/index.ts'
import { WorkersAiProvider, type WorkersAiBinding } from './providers/workers-ai.ts'
import type { LlmDescriptor, Transport } from './types.ts'

export type { WorkersAiBinding }

export const PROVIDER_DESCRIPTORS: LlmDescriptor[] = [
  {
    key: 'openrouter',
    name: 'OpenRouter',
    system: 'OpenRouter',
    implemented: true,
    summary: 'One key to many hosted models through an OpenAI-compatible gateway.',
  },
  {
    key: 'cloudflare',
    name: 'Cloudflare Workers AI',
    system: 'Cloudflare',
    implemented: true,
    summary: 'Workers AI models at the edge. Free-plan models available.',
  },
  {
    key: 'ollama-cloud',
    name: 'Ollama Cloud',
    system: 'Ollama',
    implemented: true,
    summary: 'Hosted Ollama models with an API key.',
  },
  {
    key: 'ollama',
    name: 'Ollama (local)',
    system: 'Ollama',
    implemented: true,
    summary: 'A local open-weight model through Ollama. No key.',
  },
  {
    key: 'openai-compatible',
    name: 'OpenAI-compatible endpoint',
    system: 'Custom',
    implemented: true,
    summary: 'Any /v1/chat/completions endpoint.',
  },
]

export function listProviders(): LlmDescriptor[] {
  return PROVIDER_DESCRIPTORS
}

/** Build the provider named by the configuration. `transport` is injected for tests. */
export function providerFor(config: AiConfig, env: AiEnv, transport?: Transport): LlmProvider {
  const common = {
    apiKey: config.apiKey ?? undefined,
    baseUrl: config.baseUrl ?? undefined,
    defaultModel: config.model,
    transport,
  }
  switch (config.provider) {
    case 'openrouter':
      return openRouterProvider(common)
    case 'cloudflare':
      return cloudflareProvider({
        ...common,
        accountId: typeof env.CLOUDFLARE_ACCOUNT_ID === 'string' ? env.CLOUDFLARE_ACCOUNT_ID : undefined,
      })
    case 'ollama-cloud':
    case 'ollama':
      return ollamaProvider(common)
    case 'openai-compatible':
      return openaiCompatibleProvider(common)
  }
}

/**
 * The provider selected by the environment, or null when the assistant is off.
 * When the Cloudflare provider is selected and the native Workers AI binding is
 * present, the binding is used (no key required); otherwise the HTTP adapter is.
 */
export function configuredProvider(
  env: AiEnv & { AI?: WorkersAiBinding },
  transport?: Transport,
): LlmProvider | null {
  const config = aiConfig(env)
  if (!config) return null
  if (config.provider === 'cloudflare' && env.AI) {
    return new WorkersAiProvider(env.AI, config.model)
  }
  return providerFor(config, env, transport)
}
