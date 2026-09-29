import { useCallback, useState } from 'react'
import type { DeskParties } from '../types.ts'
import {
  GROFTY_EXTENSION_ID,
  GROFTY_INSTALL_URL,
  GROFTY_QUICKSTART_URL,
  PURPOSE_LOCK,
  detectCip103Provider,
  formatGroftyError,
  proveRequestThenGrant,
  type ConnectResult,
  type GroftyClient,
  type GroftyMode,
} from '../lib/groftyBrowser.ts'

type Props = {
  mode: GroftyMode
  client: GroftyClient
  parties: DeskParties
  busy: boolean
  onModeChange: (mode: GroftyMode) => Promise<void>
  onLog: (level: 'info' | 'ok' | 'warn' | 'error', message: string) => void
}

export function GroftyPanel({
  mode,
  client,
  parties,
  busy,
  onModeChange,
  onLog,
}: Props) {
  const [connectInfo, setConnectInfo] = useState<ConnectResult | null>(null)
  const [probe, setProbe] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [proposalCid, setProposalCid] = useState('')
  const [lastRequestCmd, setLastRequestCmd] = useState<string | null>(null)
  const [localBusy, setLocalBusy] = useState(false)
  const working = busy || localBusy

  const run = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      setLocalBusy(true)
      setError(null)
      try {
        await fn()
        onLog('ok', label)
      } catch (e) {
        const msg = formatGroftyError(e)
        setError(msg)
        onLog('error', `${label} failed: ${msg}`)
      } finally {
        setLocalBusy(false)
      }
    },
    [onLog],
  )

  const switchMode = (next: GroftyMode) =>
    run(`Grofty mode → ${next}`, async () => {
      await onModeChange(next)
      setConnectInfo(null)
      setProbe(null)
      setLastRequestCmd(null)
    })

  const onProbe = () =>
    run('Probe CIP-103 provider', async () => {
      if (mode === 'mock') {
        setProbe('mock mode — no extension required')
        return
      }
      const r = await detectCip103Provider()
      setProbe(r.present ? `present: ${r.detail}` : `missing: ${r.detail}`)
      if (!r.present) {
        throw new Error(
          `Grofty extension not detected. Install ${GROFTY_INSTALL_URL} (id ${GROFTY_EXTENSION_ID}), then whitelist ${GROFTY_QUICKSTART_URL}`,
        )
      }
    })

  const onConnect = () =>
    run('Grofty connect', async () => {
      const r = await client.connect()
      setConnectInfo(r)
    })

  const onProveRequest = () =>
    run('Prove RequestAuthorization', async () => {
      const result = await proveRequestThenGrant(client, {
        request: {
          requester: parties.creditOfficer,
          subject: parties.borrower,
          role: 'BorrowerRole',
          purpose: PURPOSE_LOCK,
        },
      })
      setLastRequestCmd(JSON.stringify(result.requestCommand, null, 2))
      onLog(
        'info',
        `RequestAuthorization ${mode === 'live' ? 'prepareExecute' : 'mock'}: ${
          result.requestResult?.correlationId ?? 'built'
        }`,
      )
    })

  const onProveGrant = () =>
    run('Prove Grant (prepareExecute)', async () => {
      const cid =
        proposalCid.trim() ||
        (mode === 'mock'
          ? `mock-cid-AuthorizationProposal-${crypto.randomUUID()}`
          : '')
      if (!cid) {
        throw new Error(
          'Paste an AuthorizationProposal contract id (from ACS after create). Mock mode can leave this blank.',
        )
      }
      const result = await proveRequestThenGrant(client, {
        request: {
          requester: parties.creditOfficer,
          subject: parties.borrower,
          role: 'BorrowerRole',
          purpose: PURPOSE_LOCK,
        },
        grant: {
          proposalContractId: cid,
          args: {
            requester: parties.creditOfficer,
            authority: parties.authAuthority,
            subject: parties.borrower,
            role: 'BorrowerRole',
            purpose: PURPOSE_LOCK,
          },
        },
      })
      setLastRequestCmd(JSON.stringify(result.requestCommand, null, 2))
      if (result.grantPayload) {
        onLog(
          'ok',
          `Grant payload mode=${result.grantPayload.mode} cid=${
            result.grantPayload.contractId ?? '(pending ACS)'
          } corr=${result.grantPayload.correlationId ?? '—'}`,
        )
      }
    })

  return (
    <section className="panel grofty-panel">
      <h2>Grofty (CIP-103)</h2>
      <p className="muted">
        Toggle mock (offline) vs live (browser extension). Live needs Grofty
        installed + whitelist; Desk / CreditOfficer is never Grofty-authorized.
      </p>

      <div className="mode-toggle" role="group" aria-label="Grofty mode">
        <button
          type="button"
          className={mode === 'mock' ? 'primary' : undefined}
          disabled={working}
          onClick={() => void switchMode('mock')}
        >
          Mock
        </button>
        <button
          type="button"
          className={mode === 'live' ? 'primary' : undefined}
          disabled={working}
          onClick={() => void switchMode('live')}
        >
          Live
        </button>
        <span className={`badge ${mode === 'live' ? '' : 'badge-muted'}`}>
          GROFTY_MODE={mode}
        </span>
      </div>

      {mode === 'live' && (
        <div className="live-help">
          <ol>
            <li>
              Install extension:{' '}
              <a href={GROFTY_INSTALL_URL} target="_blank" rel="noreferrer">
                grofty.cc/download
              </a>{' '}
              (id <code>{GROFTY_EXTENSION_ID}</code>)
            </li>
            <li>
              Whitelist / onboard:{' '}
              <a href={GROFTY_QUICKSTART_URL} target="_blank" rel="noreferrer">
                quick-start
              </a>{' '}
              → copy Party ID
            </li>
            <li>Upload Desk DAR to the synchronizer your party uses</li>
            <li>
              Probe → Connect → Prove RequestAuthorization → Grant (paste
              proposal cid)
            </li>
          </ol>
        </div>
      )}

      <div className="actions">
        <button type="button" disabled={working} onClick={() => void onProbe()}>
          Probe provider
        </button>
        <button
          type="button"
          className="primary"
          disabled={working}
          onClick={() => void onConnect()}
        >
          Connect
        </button>
        <button
          type="button"
          disabled={working}
          onClick={() => void onProveRequest()}
        >
          Prove RequestAuthorization
        </button>
      </div>

      <div className="form-inline">
        <label>
          AuthorizationProposal cid (for Grant)
          <input
            value={proposalCid}
            onChange={(e) => setProposalCid(e.target.value)}
            placeholder={
              mode === 'mock'
                ? 'optional in mock — auto-filled if blank'
                : 'required for live Grant (from ACS)'
            }
            disabled={working}
          />
        </label>
        <button
          type="button"
          className="primary"
          disabled={working}
          onClick={() => void onProveGrant()}
        >
          RequestAuthorization → Grant
        </button>
      </div>

      {probe && (
        <p className="mono muted" style={{ marginTop: '0.75rem' }}>
          Probe: {probe}
        </p>
      )}
      {connectInfo && (
        <dl className="kv" style={{ marginTop: '0.75rem' }}>
          <dt>Connected</dt>
          <dd>
            {connectInfo.isConnected ? 'yes' : 'no'} · {connectInfo.providerLabel}
          </dd>
          <dt>Accounts</dt>
          <dd>
            {connectInfo.accounts.length
              ? connectInfo.accounts
                  .map((a) => a.hint ?? a.partyId.slice(0, 24))
                  .join(', ')
              : '(none yet — whitelist / session)'}
          </dd>
        </dl>
      )}
      {lastRequestCmd && (
        <details style={{ marginTop: '0.75rem' }}>
          <summary>Last RequestAuthorization command</summary>
          <pre className="cmd-pre">{lastRequestCmd}</pre>
        </details>
      )}
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
