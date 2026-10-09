import type { LlmProvider } from '../provider.ts'
import type { Transport } from '../types.ts'
import { OpenAiCompatibleProvider } from './openai-compatible.ts'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const OLLAMA_LOCAL_BASE_URL = 'http://127.0.0.1:11434/v1'
const OLLAMA_CLOUD_BASE_URL = 'https://ollama.com/v1'

export interface ProviderOptions {
  apiKey?: string
  baseUrl?: string
  defaultModel?: string
  transport?: Transport
}

/** OpenRouter — one key, many hosted models (OpenAI wire format). */
export function openRouterProvider(options: ProviderOptions): LlmProvider {
  return new OpenAiCompatibleProvider({
    key: 'openrouter',
    descriptor: {
      key: 'openrouter',
      name: 'OpenRouter',
      system: 'OpenRouter',
      implemented: true,
      summary: 'One key to many hosted models through an OpenAI-compatible gateway.',
    },
    baseUrl: options.baseUrl ?? OPENROUTER_BASE_URL,
    apiKey: options.apiKey,
    defaultModel: options.defaultModel ?? 'openai/gpt-4o-mini',
    transport: options.transport,
    requireApiKey: true,
    headers: { 'http-referer': 'https://collat.trade', 'x-title': 'collat.trade' },
  })
}

/** Ollama — a local daemon, or Ollama Cloud when a base URL + key are supplied. */
export function ollamaProvider(options: ProviderOptions): LlmProvider {
  const cloud = Boolean(options.apiKey)
  return new OpenAiCompatibleProvider({
    key: cloud ? 'ollama-cloud' : 'ollama',
    descriptor: cloud
      ? {
          key: 'ollama-cloud',
          name: 'Ollama Cloud',
          system: 'Ollama',
          implemented: true,
          summary: 'Hosted Ollama models with an API key. OpenAI-compatible endpoint.',
        }
      : {
          key: 'ollama',
          name: 'Ollama (local)',
          system: 'Ollama',
          implemented: true,
          summary: 'A local open-weight model through Ollama. No key.',
        },
    baseUrl: options.baseUrl ?? (cloud ? OLLAMA_CLOUD_BASE_URL : OLLAMA_LOCAL_BASE_URL),
    apiKey: options.apiKey,
    defaultModel: options.defaultModel ?? (cloud ? 'gpt-oss:120b' : 'llama3.1'),
    transport: options.transport,
    requireApiKey: cloud,
  })
}

/**
 * Cloudflare Workers AI through its OpenAI-compatible endpoint. Base URL is
 * derived from the account id; `emptyContentForToolCalls` is required.
 */
export function cloudflareProvider(
  options: ProviderOptions & { accountId?: string },
): LlmProvider {
  const base =
    options.baseUrl ??
    (options.accountId
      ? `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/ai/v1`
      : 'https://api.cloudflare.com/client/v4/accounts/account/ai/v1')
  return new OpenAiCompatibleProvider({
    key: 'cloudflare',
    descriptor: {
      key: 'cloudflare',
      name: 'Cloudflare Workers AI',
      system: 'Cloudflare',
      implemented: true,
      summary: 'Workers AI models at the edge. Free-plan models available.',
    },
    baseUrl: base,
    apiKey: options.apiKey,
    defaultModel: options.defaultModel ?? '@cf/qwen/qwen3-30b-a3b-fp8',
    transport: options.transport,
    requireApiKey: true,
    emptyContentForToolCalls: true,
  })
}

/** Any /v1/chat/completions endpoint: Azure, Groq, vLLM, LM Studio, … */
export function openaiCompatibleProvider(options: ProviderOptions): LlmProvider {
  return new OpenAiCompatibleProvider({
    key: 'openai-compatible',
    descriptor: {
      key: 'openai-compatible',
      name: 'OpenAI-compatible endpoint',
      system: 'Custom',
      implemented: true,
      summary: 'Any /v1/chat/completions endpoint.',
    },
    baseUrl: options.baseUrl ?? 'http://127.0.0.1:8000/v1',
    apiKey: options.apiKey,
    defaultModel: options.defaultModel ?? 'default',
    transport: options.transport,
  })
}
