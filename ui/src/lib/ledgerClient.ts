/**
 * Canton JSON Ledger API client (v2) for the operator console.
 *
 * Drives the same bilateral flow Desk.Demo does, but from the browser against a
 * running sandbox (Path A). The JSON Ledger API has no CORS headers, so requests
 * go through the Vite dev proxy at /ledger (see vite.config.ts).
 *
 * This is the transport behind `createLedgerDeskApi` — the UI never changes.
 */

export type LedgerConfig = {
  /** Base path; defaults to the Vite proxy. */
  baseUrl?: string
  /** Ledger user id (sandbox uses participant_admin). */
  userId?: string
}

export type ContractEvent = {
  contractId: string
  templateId: string
  createArgument: Record<string, unknown>
}

const PACKAGE = '#cbtc-collateral-desk'
const DEFAULT_USER = 'participant_admin'

export class LedgerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LedgerError'
  }
}

export class LedgerClient {
  private baseUrl: string
  private userId: string
  private counter = 0

  constructor(config: LedgerConfig = {}) {
    this.baseUrl = (config.baseUrl ?? '/ledger').replace(/\/+$/, '')
    this.userId = config.userId ?? DEFAULT_USER
  }

  /** Whether a ledger is reachable (used to switch the console to live mode). */
  async ping(): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/v2/state/ledger-end`)
      return r.ok
    } catch {
      return false
    }
  }

  async parties(): Promise<Record<string, string>> {
    const d = await this.get('/v2/parties')
    const list = (d as { partyDetails?: { party: string }[] }).partyDetails ?? []
    const out: Record<string, string> = {}
    for (const p of list) {
      const hint = p.party.split('::')[0].replace(/-[0-9a-f]+$/, '')
      out[hint] = p.party
    }
    return out
  }

  /** Allocate a party by hint (idempotent-ish: returns existing on conflict). */
  async allocateParty(hint: string): Promise<string> {
    try {
      const d = await this.post('/v2/parties', { partyIdHint: hint, userId: this.userId })
      return (d as { partyDetails: { party: string } }).partyDetails.party
    } catch {
      const all = await this.parties()
      if (all[hint]) return all[hint]
      throw new LedgerError(`could not allocate party ${hint}`)
    }
  }

  /** Submit a command batch and return the created/updated events. */
  async submit(
    actAs: string[],
    commands: unknown[],
  ): Promise<{ updateId: string; events: ContractEvent[] }> {
    const d = await this.post('/v2/commands/submit-and-wait-for-transaction', {
      commands: {
        commandId: `collat-ui-${Date.now()}-${this.counter++}`,
        userId: this.userId,
        actAs,
        commands,
      },
    })
    const tx = (d as {
      transaction?: { updateId: string; events?: { CreatedEvent?: ContractEvent }[] }
    }).transaction
    if (!tx) throw new LedgerError('no transaction in response')
    const events = (tx.events ?? [])
      .map((e) => e.CreatedEvent)
      .filter((e): e is ContractEvent => Boolean(e))
    return { updateId: tx.updateId, events }
  }

  /** The first created contract of the given template suffix, else throw. */
  static firstCreated(
    events: ContractEvent[],
    templateSuffix: string,
  ): ContractEvent {
    const hit = events.find((e) => e.templateId.endsWith(templateSuffix))
    if (!hit) throw new LedgerError(`no ${templateSuffix} contract created`)
    return hit
  }

  private async get(path: string): Promise<unknown> {
    const r = await fetch(`${this.baseUrl}${path}`, {
      headers: { accept: 'application/json' },
    })
    return this.parse(r)
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const r = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return this.parse(r)
  }

  private async parse(r: Response): Promise<unknown> {
    const text = await r.text()
    let json: unknown
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      throw new LedgerError(`non-JSON response (HTTP ${r.status})`)
    }
    if (!r.ok) {
      const detail =
        (json as { cause?: string; message?: string }).cause ??
        (json as { message?: string }).message ??
        `HTTP ${r.status}`
      throw new LedgerError(detail)
    }
    return json
  }
}

/* ── Command builders (mirror daml/Desk/*.daml) ──────────────────────────── */

export function createCmd(suffix: string, args: Record<string, unknown>) {
  return { CreateCommand: { templateId: `${PACKAGE}:${suffix}`, createArguments: args } }
}

export function exerciseCmd(suffix: string, contractId: string, choice: string, choiceArgument: Record<string, unknown> = {}) {
  return {
    ExerciseCommand: {
      templateId: `${PACKAGE}:${suffix}`,
      contractId,
      choice,
      choiceArgument,
    },
  }
}
