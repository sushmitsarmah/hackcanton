import type { LlmProvider } from './provider.ts'
import { SYSTEM_PROMPT, refusalFor } from './prompt.ts'
import { findTool, toolDefinitions } from './tools/registry.ts'
import type { AgentToolContext, DeskSnapshot, ToolPreview } from './tools/types.ts'
import type { ChatMessage } from './types.ts'

const MAX_TOOL_ITERATIONS = 5

/** One event the runtime emits to the NDJSON route. */
export type RuntimeEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool'; tool: string; status: string; summary?: string; route?: string }
  | { type: 'awaiting_confirmation'; toolCallId: string; tool: string; route?: string; preview?: ToolPreview }
  | { type: 'done'; status: string }
  | { type: 'error'; message: string }

export interface RunTurnInput {
  provider: LlmProvider
  model: string
  message: string
  history: { role: string; content: string }[]
  desk: DeskSnapshot
  temperature?: number | null
  maxTokens?: number | null
  signal?: AbortSignal
}

/**
 * Run one turn. Read/navigate tools run immediately; the first propose tool the
 * model requests ends the turn as a proposal (awaiting_confirmation) and does
 * nothing else. This is the gate: the model can only ask.
 */
export async function* runTurn(input: RunTurnInput): AsyncGenerator<RuntimeEvent> {
  const refusal = refusalFor(input.message)
  if (refusal) {
    yield { type: 'text', delta: refusal }
    yield { type: 'done', status: 'refused' }
    return
  }

  const ctx: AgentToolContext = { desk: input.desk }
  const tools = toolDefinitions()
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...input.history.map((h) => ({ role: h.role as ChatMessage['role'], content: h.content })),
    { role: 'user', content: input.message },
  ]

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    let result
    try {
      result = await input.provider.complete({
        messages,
        tools,
        model: input.model,
        temperature: input.temperature ?? undefined,
        maxTokens: input.maxTokens ?? undefined,
        signal: input.signal,
      })
    } catch (err) {
      yield { type: 'error', message: err instanceof Error ? err.message : String(err) }
      return
    }

    if (result.text) yield { type: 'text', delta: result.text }

    if (!result.toolCalls.length) {
      yield { type: 'done', status: 'answered' }
      return
    }

    // Record the assistant's tool-call turn so the loop can continue.
    messages.push({ role: 'assistant', content: result.text, toolCalls: result.toolCalls })

    for (const call of result.toolCalls) {
      const tool = findTool(call.name)
      if (!tool) {
        messages.push({
          role: 'tool',
          content: `Unknown tool "${call.name}".`,
          toolCallId: call.id,
          name: call.name,
        })
        continue
      }

      if (tool.kind === 'propose') {
        const preview = tool.preview?.(call.arguments, ctx)
        yield {
          type: 'awaiting_confirmation',
          toolCallId: call.id,
          tool: call.name,
          preview,
        }
        yield { type: 'done', status: 'awaiting_confirmation' }
        return
      }

      const out = (await tool.run?.(call.arguments, ctx)) ?? { text: 'ok' }
      yield { type: 'tool', tool: call.name, status: 'ok', summary: out.text, route: out.route }
      messages.push({
        role: 'tool',
        content: out.text,
        toolCallId: call.id,
        name: call.name,
      })
    }
  }

  yield { type: 'text', delta: '\n\n(Stopped after too many tool steps.)' }
  yield { type: 'done', status: 'max_steps' }
}
