/**
 * Neutral shapes for the assistant's LLM port (ported from token-ledger).
 *
 * A provider adapter (OpenRouter, Ollama Cloud, Cloudflare Workers AI, or any
 * OpenAI-compatible endpoint) maps these to and from its wire format. The
 * runtime, the tool registry and the chat route only ever see these, so a new
 * provider is one adapter — not a change to the agent.
 */

export type ProviderKey =
  | 'openrouter'
  | 'ollama'
  | 'ollama-cloud'
  | 'cloudflare'
  | 'openai-compatible'

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

export interface JsonSchema {
  type: 'object'
  properties?: Record<string, unknown>
  required?: string[]
  additionalProperties?: boolean
  [key: string]: unknown
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: JsonSchema
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ChatMessage {
  role: ChatRole
  content: string
  toolCalls?: ToolCall[]
  toolCallId?: string
  name?: string
}

export interface CompletionRequest {
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  model?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export type FinishReason = 'stop' | 'tool_calls' | 'length' | 'error'

export interface TokenUsage {
  inputTokens?: number
  outputTokens?: number
}

export interface CompletionResult {
  text: string
  toolCalls: ToolCall[]
  finishReason: FinishReason
  usage?: TokenUsage
  model?: string
}

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_call'; toolCall: ToolCall }
  | { type: 'done'; result: CompletionResult }
  | { type: 'error'; message: string }

export interface LlmDescriptor {
  key: ProviderKey
  name: string
  system: string
  implemented: boolean
  summary: string
}

/** Injectable fetch, so every adapter is testable offline. */
export type Transport = (input: string, init?: RequestInit) => Promise<Response>

export const defaultTransport: Transport = (input, init) => globalThis.fetch(input, init)
