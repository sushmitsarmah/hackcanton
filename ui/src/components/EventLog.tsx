import type { LogEntry } from '../types.ts'

type Props = { entries: LogEntry[] }

export function EventLog({ entries }: Props) {
  return (
    <section className="panel event-log">
      <h2>Event log</h2>
      <ul>
        {entries.length === 0 && <li className="muted">No events yet.</li>}
        {[...entries].reverse().map((e) => (
          <li key={e.id} className={`log-${e.level}`}>
            <time dateTime={e.at}>{new Date(e.at).toLocaleTimeString()}</time>
            <span>{e.message}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
