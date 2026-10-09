import { useState } from 'react'
import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  type ToolCallMessagePartComponent,
} from '@assistant-ui/react'
import { ChatRuntimeProvider } from './chat-runtime-provider.tsx'
import { ChatToolCard } from './ChatToolCard.tsx'
import type { DeskSnapshot } from './deskSnapshot.ts'
import type { AssistantConfig } from './useAssistantConfig.ts'

const toolComponents = { Fallback: ChatToolCard as ToolCallMessagePartComponent }

const STARTERS = [
  'Explain the current health factor',
  'What step are we on?',
  'Propose a 100,000 USDCx loan against 2 CBTC',
  'Liquidate this position',
] as const

export interface ChatPanelProps {
  /** Which providers/models this deployment can use. */
  config: AssistantConfig | null
  getDesk: () => DeskSnapshot
  selection: { provider: string; model: string }
  onSelectionChange: (s: { provider: string; model: string }) => void
  onNavigate?: (step: string) => void
  onConfirm: (input: {
    tool: string
    args: Record<string, unknown>
    decision: 'confirm' | 'reject'
  }) => Promise<{ text: string; route?: string }>
}

/** Provider + model picker; switches take effect on the next turn. */
function ModelSelector({
  config,
  selection,
  onChange,
}: {
  config: AssistantConfig
  selection: { provider: string; model: string }
  onChange: (s: { provider: string; model: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const activeProvider = selection.provider || config.available[0] || ''
  const provName =
    config.providers.find((p) => p.key === activeProvider)?.name ?? activeProvider
  const activeModel =
    selection.model || config.defaults[activeProvider] || ''
  return (
    <div className="chat-model">
      <button
        type="button"
        className="chat-model-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {provName} · {activeModel.split('/').pop()}
      </button>
      {open ? (
        <div role="menu" className="chat-model-menu">
          {config.available.map((key) => {
            const prov = config.providers.find((p) => p.key === key)
            const models = config.models[key] ?? []
            return (
              <div key={key} className="chat-model-group">
                <p className="chat-model-prov">{prov?.name ?? key}</p>
                {models.map((m) => {
                  const selected = activeProvider === key && activeModel === m.id
                  return (
                    <button
                      key={`${key}:${m.id}`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      className={`chat-model-item ${selected ? 'selected' : ''}`}
                      onClick={() => {
                        onChange({ provider: key, model: m.id })
                        setOpen(false)
                      }}
                    >
                      <span className="chat-model-label">{m.label}</span>
                      {m.free ? <span className="chip">free</span> : null}
                      {selected ? <span aria-hidden>✓</span> : null}
                    </button>
                  )
                })}
              </div>
            )
          })}
          {selection.provider || selection.model ? (
            <button
              type="button"
              className="chat-model-reset"
              onClick={() => {
                onChange({ provider: '', model: '' })
                setOpen(false)
              }}
            >
              Reset to deployment default
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Mark() {
  return (
    <span className="chat-mark" aria-hidden>
      ✦
    </span>
  )
}

function Thread() {
  return (
    <ThreadPrimitive.Root className="chat-thread">
      <ThreadPrimitive.Viewport className="chat-viewport">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div className="chat-empty">
            <Mark />
            <p className="chat-empty-title">Desk assistant</p>
            <p className="muted">
              Ask about the position, or tell me what to do — I&apos;ll open the
              step or prepare the action for your confirmation.
            </p>
            <div className="chat-starters">
              {STARTERS.map((p) => (
                <ThreadPrimitive.Suggestion key={p} prompt={p} send className="chat-starter">
                  {p}
                </ThreadPrimitive.Suggestion>
              ))}
            </div>
          </div>
        </AuiIf>

        <ThreadPrimitive.Messages>
          {({ message }) =>
            message.role === 'user' ? (
              <MessagePrimitive.Root className="chat-msg user">
                <div className="chat-bubble user">
                  <MessagePrimitive.Parts
                    components={{ Text: ({ text }) => <p>{text}</p> }}
                  />
                </div>
              </MessagePrimitive.Root>
            ) : (
              <MessagePrimitive.Root className="chat-msg assistant">
                <Mark />
                <div className="chat-bubble assistant">
                  <MessagePrimitive.Parts components={{ tools: toolComponents }} />
                </div>
              </MessagePrimitive.Root>
            )
          }
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="chat-composer">
        <ComposerPrimitive.Input
          className="chat-input"
          placeholder="Ask the desk assistant…"
          rows={1}
        />
        <ComposerPrimitive.Send className="chat-send button primary small">
          Send
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  )
}

/** Floating bottom-right assistant launcher. */
export function ChatPanel({
  config,
  getDesk,
  selection,
  onSelectionChange,
  onNavigate,
  onConfirm,
}: ChatPanelProps) {
  const [open, setOpen] = useState(false)

  if (!config?.configured) return null

  // The adapter reads the latest selection via a closure; keying the provider on
  // the selection remounts the runtime so a switch applies immediately.
  const getSelection = () => selection

  return (
    <>
      <button
        type="button"
        className={`chat-launcher ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close desk assistant' : 'Open desk assistant'}
      >
        {open ? '×' : <Mark />}
      </button>

      {open ? (
        <div className="chat-window" role="dialog" aria-label="Desk assistant">
          <header className="chat-window-head">
            <Mark />
            <strong>Desk assistant</strong>
            <ModelSelector
              config={config}
              selection={selection}
              onChange={onSelectionChange}
            />
            <button
              type="button"
              className="chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </header>
          <ChatRuntimeProvider
            key={`${selection.provider}:${selection.model}`}
            getDesk={getDesk}
            getSelection={getSelection}
            onNavigate={onNavigate}
            onConfirm={onConfirm}
          >
            <Thread />
          </ChatRuntimeProvider>
        </div>
      ) : null}
    </>
  )
}
