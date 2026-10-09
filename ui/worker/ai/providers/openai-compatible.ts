import { ProviderError, ProviderResponseError } from '../errors.ts'
import type { LlmProvider } from '../provider.ts'
import type {
  ChatMessage,
  CompletionRequest,
  CompletionResult,
  FinishReason,
  LlmDescriptor,
  ToolCall,
  ToolDefinition,
  Transport,
} from '../types.ts'
import { defaultTransport } from '../types.ts'

export interface OpenAiCompatibleOptions {
  key: LlmDescriptor['key']
  descriptor: LlmDescriptor
  /** Base URL without the `/chat/completions` suffix, e.g. `https://api.openai.com/v1`. */
  baseUrl: string
  apiKey?: string
  defaultModel: string
  transport?: Transport
  headers?: Record<string, string>
  requireApiKey?: boolean
  /** Cloudflare needs an empty string (not null) for a tool-call assistant message. */
  emptyContentForToolCalls?: boolean
}

interface WireToolCall {
  id?: string
  type?: string
  function?: { name?: string; arguments?: string }
}

interface WireMessage {
  role: string
  content?: string | null
  tool_calls?: WireToolCall[]
  tool_call_id?: string
  name?: string
}

interface WireChoice {
  message?: WireMessage
  finish_reason?: string
}

interface WireResponse {
  choices?: WireChoice[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  model?: string
  error?: { message?: string }
}

/**
 * One adapter for every endpoint that speaks the OpenAI Chat Completions wire
 * format: OpenRouter, Ollama, Cloudflare Workers AI, Groq, vLLM, LM Studio.
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly key: LlmDescriptor['key']
  readonly descriptor: LlmDescriptor
  private readonly baseUrl: string
  private readonly apiKey?: string
  private readonly defaultModel: string
  private readonly transport: Transport
  private readonly headers: Record<string, string>
  private readonly requireApiKey: boolean
  private readonly emptyContentForToolCalls: boolean

  constructor(options: OpenAiCompatibleOptions) {
    this.key = options.key
    this.descriptor = options.descriptor
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.apiKey = options.apiKey
    this.defaultModel = options.defaultModel
    this.transport = options.transport ?? defaultTransport
    this.headers = options.headers ?? {}
    this.requireApiKey = options.requireApiKey ?? false
    this.emptyContentForToolCalls = options.emptyContentForToolCalls ?? false
    if (this.requireApiKey && !this.apiKey) {
      throw new ProviderError(this.key, `${this.descriptor.name} requires an API key.`)
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const body: Record<string, unknown> = {
      model: request.model || this.defaultModel,
      messages: toWireMessages(request.messages, {
        emptyContentForToolCalls: this.emptyContentForToolCalls,
      }),
      stream: false,
    }
    if (request.tools?.length) {
      body.tools = toWireTools(request.tools)
      body.tool_choice = 'auto'
    }
    if (request.temperature !== undefined) body.temperature = request.temperature
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens

    const response = await this.transport(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.requestHeaders(),
      body: JSON.stringify(body),
      signal: request.signal,
    })
    const json = await this.readJson(response)
    const choice = json.choices?.[0]
    if (!choice?.message) {
      throw new ProviderResponseError(this.key, 'missing choices[0].message')
    }
    return {
      text: choice.message.content ?? '',
      toolCalls: fromWireToolCalls(choice.message.tool_calls),
      finishReason: mapFinishReason(choice.finish_reason, choice.message.tool_calls),
      usage: json.usage
        ? {
            inputTokens: json.usage.prompt_tokens,
            outputTokens: json.usage.completion_tokens,
          }
        : undefined,
      model: json.model,
    }
  }

  private requestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...this.headers,
    }
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`
    return headers
  }

  private async readJson(response: Response): Promise<WireResponse> {
    const text = await response.text()
    let json: WireResponse
    try {
      json = text ? (JSON.parse(text) as WireResponse) : {}
    } catch {
      throw new ProviderResponseError(this.key, `non-JSON response (HTTP ${response.status})`)
    }
    if (!response.ok) {
      const detail = json.error?.message ?? `HTTP ${response.status}`
      throw new ProviderError(this.key, `${this.descriptor.name}: ${detail}`, response.status)
    }
    return json
  }
}

export function toWireMessages(
  messages: ChatMessage[],
  options: { emptyContentForToolCalls?: boolean } = {},
): WireMessage[] {
  return messages.map((message) => {
    if (message.role === 'tool') {
      return {
        role: 'tool',
        content: message.content,
        tool_call_id: message.toolCallId,
        name: message.name,
      }
    }
    if (message.role === 'assistant' && message.toolCalls?.length) {
      return {
        role: 'assistant',
        content: options.emptyContentForToolCalls ? message.content || '' : message.content || null,
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.arguments ?? {}) },
        })),
      }
    }
    return { role: message.role, content: message.content }
  })
}

export function toWireTools(tools: ToolDefinition[]): unknown[] {
  return tools.map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }))
}

export function fromWireToolCalls(calls: WireToolCall[] | undefined): ToolCall[] {
  if (!calls?.length) return []
  return calls.map((call, index) => ({
    id: call.id ?? `call_${index}`,
    name: call.function?.name ?? '',
    arguments: parseArguments(call.function?.arguments),
  }))
}

function parseArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function mapFinishReason(
  reason: string | undefined,
  toolCalls: WireToolCall[] | undefined,
): FinishReason {
  if (reason === 'tool_calls' || toolCalls?.length) return 'tool_calls'
  if (reason === 'length') return 'length'
  if (reason === 'error') return 'error'
  return 'stop'
}
