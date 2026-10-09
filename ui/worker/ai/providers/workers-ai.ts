import { ProviderError } from '../errors.ts'
import type { LlmProvider } from '../provider.ts'
import {
  fromWireToolCalls,
  mapFinishReason,
  toWireMessages,
  toWireTools,
} from './openai-compatible.ts'
import type { CompletionRequest, CompletionResult, LlmDescriptor } from '../types.ts'

/** The shape of the native Workers AI binding (`env.AI`). */
export interface WorkersAiBinding {
  run: (model: string, inputs: unknown, options?: unknown) => Promise<unknown>
}

const DESCRIPTOR: LlmDescriptor = {
  key: 'cloudflare',
  name: 'Cloudflare Workers AI',
  system: 'Cloudflare',
  implemented: true,
  summary: 'Native Workers AI binding on this account. No key required.',
}

interface WireChoice {
  message?: {
    content?: string | null
    tool_calls?: { id?: string; type?: string; function?: { name?: string; arguments?: string } }[]
  }
  finish_reason?: string
}
interface WireResponse {
  choices?: WireChoice[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  model?: string
}

/**
 * Workers AI through the native binding. `binding.run(model, { messages, tools })`
 * speaks the OpenAI Chat Completions shape, so the wire helpers are shared with
 * the HTTP adapter. Cloudflare needs an empty string (not null) on a tool-call
 * assistant message, which `toWireMessages` handles via the option.
 */
export class WorkersAiProvider implements LlmProvider {
  readonly key = 'cloudflare' as const
  readonly descriptor = DESCRIPTOR
  private readonly binding: WorkersAiBinding
  private readonly defaultModel: string

  constructor(binding: WorkersAiBinding, defaultModel: string) {
    this.binding = binding
    this.defaultModel = defaultModel
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const inputs: Record<string, unknown> = {
      messages: toWireMessages(request.messages, { emptyContentForToolCalls: true }),
    }
    if (request.tools?.length) {
      inputs.tools = toWireTools(request.tools)
      inputs.tool_choice = 'auto'
    }
    if (request.temperature !== undefined) inputs.temperature = request.temperature
    if (request.maxTokens !== undefined) inputs.max_tokens = request.maxTokens

    let json: WireResponse
    try {
      json = (await this.binding.run(
        request.model || this.defaultModel,
        inputs,
      )) as WireResponse
    } catch (err) {
      throw new ProviderError(
        'cloudflare',
        `Workers AI: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    const choice = json.choices?.[0]
    if (!choice?.message) {
      throw new ProviderError('cloudflare', 'Workers AI: missing choices[0].message')
    }
    return {
      text: choice.message.content ?? '',
      toolCalls: fromWireToolCalls(choice.message.tool_calls),
      finishReason: mapFinishReason(choice.finish_reason, choice.message.tool_calls),
      usage: json.usage
        ? { inputTokens: json.usage.prompt_tokens, outputTokens: json.usage.completion_tokens }
        : undefined,
      model: json.model,
    }
  }
}
