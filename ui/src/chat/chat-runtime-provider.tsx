import { useMemo, type ReactNode } from 'react'
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  WebSpeechDictationAdapter,
  type ThreadMessageLike,
} from '@assistant-ui/react'
import { createChatAdapter } from './chat-adapter.ts'
import type { DeskSnapshot } from './deskSnapshot.ts'

export interface ChatRuntimeProviderProps {
  children: ReactNode
  /** Snapshot the desk for each turn. */
  getDesk: () => DeskSnapshot
  /** Provider/model override for each turn. */
  getSelection?: () => { provider: string; model: string }
  /** Open a console step the assistant chose. */
  onNavigate?: (step: string) => void
  /** Execute a confirmed proposal; returns the result text. */
  onConfirm: (input: {
    tool: string
    args: Record<string, unknown>
    decision: 'confirm' | 'reject'
  }) => Promise<{ text: string; route?: string }>
  initialMessages?: readonly ThreadMessageLike[]
}

/**
 * Wraps children in an assistant-ui LocalRuntime whose model adapter talks to
 * /api/chat. The Worker is authoritative for the tool loop; this runtime owns
 * presentation and the approval gate only.
 */
export function ChatRuntimeProvider({
  children,
  getDesk,
  getSelection,
  onNavigate,
  onConfirm,
  initialMessages = [],
}: ChatRuntimeProviderProps) {
  const adapter = useMemo(
    () => createChatAdapter({ getDesk, getSelection, onNavigate, onConfirm }),
    [getDesk, getSelection, onNavigate, onConfirm],
  )

  const adapters = useMemo(() => {
    const dictation = WebSpeechDictationAdapter.isSupported()
      ? new WebSpeechDictationAdapter({ continuous: true })
      : undefined
    return { dictation }
  }, [])

  const runtime = useLocalRuntime(adapter, { maxSteps: 6, initialMessages, adapters })

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
}
