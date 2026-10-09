import type {
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from '@assistant-ui/react'
import type { ToolPreview } from './chat-adapter.ts'

const LABELS: Record<string, string> = {
  navigate: 'Open step',
  get_desk_state: 'Read desk state',
  explain_health_factor: 'Explain health factor',
  propose_terms: 'Propose loan terms',
  desk_action: 'Desk action',
}

function label(name: string): string {
  return LABELS[name] ?? name.replace(/_/g, ' ')
}

/**
 * Renders one tool call. A read tool shows its summary; a propose tool shows a
 * confirmation card (assistant-ui surfaces the approve/deny controls) built from
 * the worker's side-effect-free preview.
 */
export const ChatToolCard: ToolCallMessagePartComponent = (
  props: ToolCallMessagePartProps,
) => {
  const preview = (props.args as { preview?: ToolPreview } | undefined)?.preview
  const resultText =
    props.result && typeof props.result === 'object' && 'text' in props.result
      ? String((props.result as { text?: unknown }).text ?? '')
      : ''

  return (
    <div className="chat-tool">
      <div className="chat-tool-head">
        <span className="chat-tool-dot" aria-hidden />
        {label(props.toolName)}
        {preview ? <span className="chip">needs confirmation</span> : null}
      </div>

      {preview ? (
        <div className="chat-tool-preview">
          <dl className="kv">
            {preview.fields.map((f) => (
              <span key={f.label} style={{ display: 'contents' }}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </span>
            ))}
          </dl>
          {preview.note ? <p className="muted">{preview.note}</p> : null}
        </div>
      ) : resultText ? (
        <p className="chat-tool-result">{resultText}</p>
      ) : null}
    </div>
  )
}
