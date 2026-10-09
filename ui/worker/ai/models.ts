import type { ProviderKey } from './types.ts'

export interface CatalogModel {
  id: string
  label: string
  /** No per-token cost (free tier / free model). */
  free: boolean
  /** Known to emit real tool calls. */
  tools: boolean
}

/** Curated models per provider, best-first. A selection may also be a custom id. */
export const MODEL_CATALOG: Record<ProviderKey, CatalogModel[]> = {
  openrouter: [
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B (free)', free: true, tools: true },
    { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra 550B (free)', free: true, tools: true },
    { id: 'dots-studio/dots-3-note-preview:free', label: 'Dots 3 Note (free)', free: true, tools: true },
    { id: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o mini', free: false, tools: true },
    { id: 'anthropic/claude-3.5-sonnet', label: 'Anthropic Claude 3.5 Sonnet', free: false, tools: true },
  ],
  cloudflare: [
    { id: '@cf/qwen/qwen3-30b-a3b-fp8', label: 'Qwen3 30B A3B (free)', free: true, tools: true },
    { id: '@cf/openai/gpt-oss-20b', label: 'GPT-OSS 20B (free)', free: true, tools: true },
    { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B (free)', free: true, tools: true },
    { id: '@cf/meta/llama-3.1-8b-instruct-fp8', label: 'Llama 3.1 8B (free)', free: true, tools: true },
    { id: '@cf/mistralai/mistral-small-3.1-24b-instruct', label: 'Mistral Small 3.1 24B (free)', free: true, tools: true },
  ],
  'ollama-cloud': [
    { id: 'gpt-oss:120b', label: 'GPT-OSS 120B', free: false, tools: true },
    { id: 'qwen3:235b', label: 'Qwen3 235B', free: false, tools: true },
    { id: 'llama3.3:70b', label: 'Llama 3.3 70B', free: false, tools: true },
  ],
  ollama: [
    { id: 'llama3.1', label: 'Llama 3.1 (local)', free: true, tools: true },
    { id: 'qwen2.5', label: 'Qwen 2.5 (local)', free: true, tools: true },
  ],
  'openai-compatible': [
    { id: 'default', label: 'Default (server-configured)', free: true, tools: true },
  ],
}

export function modelsFor(provider: ProviderKey): CatalogModel[] {
  return MODEL_CATALOG[provider] ?? []
}
