import type {
  ChatModelAdapter,
  ThreadAssistantMessagePart,
  ThreadMessageLike,
} from '@assistant-ui/react'
import type { DeskSnapshot } from './deskSnapshot.ts'

/** One NDJSON event from worker/ai/runtime.ts. */
type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool'; tool: string; status: string; summary?: string; route?: string }
  | { type: 'awaiting_confirmation'; toolCallId: string; tool: string; preview?: ToolPreview }
  | { type: 'done'; status: string }
  | { type: 'error'; message: string }

export interface ToolPreview {
  action: string
  fields: { label: string; value: string }[]
  note?: string
}

export interface ChatAdapterDeps {
  /** Snapshot the desk state to send with each turn. */
  getDesk: () => DeskSnapshot
  /** Provider/model override for this turn (empty = deployment default). */
  getSelection?: () => { provider: string; model: string }
  /** Called with a step the assistant decided to open. */
  onNavigate?: (route: string) => void
  /**
   * Run a confirmed proposal in the browser (the same action the button runs).
   * Returns the result text.
   */
  onConfirm: (input: {
    tool: string
    args: Record<string, unknown>
    decision: 'confirm' | 'reject'
  }) => Promise<{ text: string; route?: string }>
}

interface ApprovalPart {
  type: string
  toolCallId?: string
  toolName?: string
  args?: unknown
  approval?: { approved?: boolean; resolution?: 'cancelled' | 'expired' }
}

function readDecisions(message: { content: readonly unknown[] }): {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  approved: boolean
}[] {
  return (message.content as readonly ApprovalPart[]).flatMap((part) =>
    part.type === 'tool-call' && part.approval?.approved !== undefined && !part.approval.resolution
      ? [
          {
            toolCallId: part.toolCallId ?? '',
            toolName: part.toolName ?? '',
            args: (part.args as Record<string, unknown>) ?? {},
            approved: part.approval.approved,
          },
        ]
      : [],
  )
}

function historyFromMessages(
  messages: readonly ThreadMessageLike[],
): { role: string; content: string }[] {
  return messages.flatMap((m) => {
    const text =
      typeof m.content === 'string'
        ? m.content
        : m.content
            .filter((p) => p.type === 'text')
            .map((p) => (p.type === 'text' ? p.text : ''))
            .join('')
    if (!text.trim()) return []
    return [{ role: m.role, content: text }]
  })
}

export function createChatAdapter(deps: ChatAdapterDeps): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal, unstable_getMessage }) {
      // A resumed run: the user answered a gate. This is the only path that
      // performs a state change, and only for the tool the operator approved.
      const decisions = readDecisions(unstable_getMessage())
      if (decisions.length > 0) {
        const parts: ThreadAssistantMessagePart[] = []
        let text = ''
        for (const d of decisions) {
          const outcome = d.approved
            ? await deps.onConfirm({ tool: d.toolName, args: d.args, decision: 'confirm' })
            : { text: 'Cancelled — nothing was changed.' }
          text = outcome.text
          if (outcome.route) deps.onNavigate?.(outcome.route)
          parts.push({
            type: 'tool-call',
            toolCallId: d.toolCallId,
            toolName: d.toolName || 'decision',
            args: d.args as unknown as Record<string, never>,
            argsText: JSON.stringify(d.args ?? {}),
            approval: { id: d.toolCallId, approved: d.approved },
            result: { text: outcome.text, route: outcome.route ?? null },
          })
        }
        yield { content: [...parts, ...(text ? [{ type: 'text' as const, text }] : [])] }
        return
      }

      const history = historyFromMessages(messages)
      const userText = history.at(-1)?.content ?? ''

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: history.slice(0, -1),
          desk: deps.getDesk(),
          provider: deps.getSelection?.().provider || undefined,
          model: deps.getSelection?.().model || undefined,
        }),
        signal: abortSignal,
      })
      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null)
        throw new Error(
          (detail as { error?: string } | null)?.error ??
            `The assistant is unavailable (${response.status}).`,
        )
      }

      const toolParts = new Map<string, ThreadAssistantMessagePart>()
      let text = ''

      for await (const event of readNdjson(response.body, abortSignal)) {
        switch (event.type) {
          case 'text':
            text += event.delta
            break
          case 'tool':
            if (event.route && event.tool === 'navigate') deps.onNavigate?.(event.route)
            toolParts.set(`${event.tool}:${toolParts.size}`, {
              type: 'tool-call',
              toolCallId: `read_${toolParts.size}`,
              toolName: event.tool,
              args: {} as Record<string, never>,
              argsText: '{}',
              result: { summary: event.summary ?? '', route: event.route ?? null },
            })
            break
          case 'awaiting_confirmation':
            toolParts.set(event.toolCallId, {
              type: 'tool-call',
              toolCallId: event.toolCallId,
              toolName: event.tool,
              args: (event.preview ? { preview: event.preview } : {}) as unknown as Record<string, never>,
              argsText: JSON.stringify(event.preview ?? {}),
              approval: { id: event.toolCallId },
            })
            break
          case 'done':
            break
          case 'error':
            throw new Error(event.message)
        }

        yield {
          content: [
            ...Array.from(toolParts.values()),
            ...(text ? [{ type: 'text' as const, text }] : []),
          ],
        }
      }

      const hasGate = Array.from(toolParts.values()).some(
        (p) => p.type === 'tool-call' && p.approval,
      )
      if (hasGate) {
        yield {
          content: [
            ...Array.from(toolParts.values()),
            ...(text ? [{ type: 'text' as const, text }] : []),
          ],
          status: { type: 'requires-action', reason: 'tool-calls' },
        }
      }
    },
  }
}

async function* readNdjson(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      if (signal.aborted) break
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let newline = buffer.indexOf('\n')
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (line) {
          try {
            yield JSON.parse(line) as ChatEvent
          } catch {
            /* skip malformed line */
          }
        }
        newline = buffer.indexOf('\n')
      }
    }
    const tail = buffer.trim()
    if (tail) {
      try {
        yield JSON.parse(tail) as ChatEvent
      } catch {
        /* ignore */
      }
    }
  } finally {
    reader.releaseLock()
  }
}
