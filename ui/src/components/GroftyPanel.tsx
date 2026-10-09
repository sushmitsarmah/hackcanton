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
  const [packageStatus, setPackageStatus] = useState<string | null>(null)
  const [networkInfo, setNetworkInfo] = useState<string | null>(null)
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
      setProbe(
        r.present
          ? `present: ${r.detail}`
          : `not announced: ${r.detail} — Connect may still work (tries the extension postMessage handshake).`,
      )
    })

  const onDisconnect = () =>
    run('Grofty disconnect', async () => {
      await client.disconnect()
      setConnectInfo(null)
      setProbe(null)
    })

  const onCheckPackage = () =>
    run('Check Desk package on wallet participant', async () => {
      const live = client as GroftyClient & {
        checkDeskPackage?: (name?: string) => Promise<{
          reachable: boolean
          present: boolean
          packageIds: string[]
          detail: string
        }>
        getNetworkInfo?: () => Promise<{
          networkId?: string
          ledgerApi?: string
          userId?: string
          connected: boolean
        }>
      }
      if (typeof live.checkDeskPackage !== 'function') {
        setPackageStatus('not supported in mock mode')
        return
      }
      if (typeof live.getNetworkInfo === 'function') {
        const n = await live.getNetworkInfo()
        setNetworkInfo(
          `network=${n.networkId ?? '?'} · ledgerApi=${n.ledgerApi ?? '(not exposed)'} · user=${n.userId ?? '?'}`,
        )
      }
      const r = await live.checkDeskPackage()
      setPackageStatus(r.detail)
    })

  const onConnect = () =>
    run('Grofty connect', async () => {
      const live = client as GroftyClient & {
        discoverProviders?: (ms?: number) => Promise<
          { id: string; name: string }[]
        >
      }
      if (mode === 'live' && typeof live.discoverProviders === 'function') {
        try {
          const announced = await live.discoverProviders(1500)
          onLog(
            'info',
            announced.length
              ? `Announced CIP-103: ${announced.map((p) => p.name || p.id).join(', ')}`
              : 'No CIP-103 announce; trying extension postMessage handshake + configured adapters',
          )
        } catch {
          /* probe is best-effort */
        }
      }
      const r = await client.connect()
      setConnectInfo(r)
    })

  const onProveRequest = () =>
    run('Build RequestAuthorization', async () => {
      // The requester is CreditOfficer, but the Grofty wallet is the authority —
      // it cannot act as CreditOfficer, so in live mode only build the command
      // (the wallet's real action is creating AuthorizationGranted below).
      const result = await proveRequestThenGrant(client, {
        submitRequest: mode !== 'live',
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
        mode === 'live'
          ? 'RequestAuthorization command built (not submitted — wallet is the authority, not the requester)'
          : `RequestAuthorization mock submit: ${
              result.requestResult?.correlationId ?? 'built'
            }`,
      )
    })

  const onProveGrant = () =>
    run('Prove Grant (wallet signs AuthorizationGranted)', async () => {
      const pasted = proposalCid.trim()
      if (pasted) {
        // Advanced: exercise AuthorizationProposal.Grant when a proposal cid is known.
        const result = await proveRequestThenGrant(client, {
          request: {
            requester: parties.creditOfficer,
            subject: parties.borrower,
            role: 'BorrowerRole',
            purpose: PURPOSE_LOCK,
          },
          grant: {
            proposalContractId: pasted,
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
        return
      }

      // Default: authority wallet creates AuthorizationGranted directly
      // (signatory = authority per Desk.Auth); real cid discovered via ACS.
      const payload = await client.authorizeSubject({
        requester: parties.creditOfficer,
        authority: parties.authAuthority,
        subject: parties.borrower,
        role: 'BorrowerRole',
        purpose: PURPOSE_LOCK,
      })
      setLastRequestCmd(
        JSON.stringify(
          {
            templateId: 'Desk.Auth:AuthorizationGranted',
            createArguments: {
              authority: payload.authority,
              subject: payload.subject,
              role: payload.role,
              purpose: payload.purpose,
            },
          },
          null,
          2,
        ),
      )
      onLog(
        'ok',
        `AuthorizationGranted mode=${payload.mode} cid=${
          payload.contractId ?? '(not returned — ACS query failed)'
        } corr=${payload.correlationId ?? '—'}`,
      )
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
            <li>
              Upload the Desk DAR to your participant (admin CLI/UI — the wallet
              cannot upload packages):{' '}
              <a href="/cbtc-collateral-desk-0.1.0.dar" download>
                download .dar
              </a>
            </li>
            <li>
              Probe → Connect → <strong>RequestAuthorization → Grant</strong>{' '}
              (your wallet signs <code>AuthorizationGranted</code>; cid is
              discovered via ACS)
            </li>
          </ol>
        </div>
      )}

      <div className="actions">
        <button type="button" disabled={working} onClick={() => void onProbe()}>
          Probe provider
        </button>
        {connectInfo?.isConnected ? (
          <button
            type="button"
            disabled={working}
            onClick={() => void onDisconnect()}
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            disabled={working}
            onClick={() => void onConnect()}
          >
            Connect
          </button>
        )}
        <button
          type="button"
          disabled={working}
          onClick={() => void onProveRequest()}
        >
          {mode === 'live' ? 'Build RequestAuthorization' : 'Prove RequestAuthorization'}
        </button>
        {mode === 'live' && (
          <>
            <button
              type="button"
              disabled={working}
              onClick={() => void onCheckPackage()}
            >
              Check Desk DAR
            </button>
            <a className="button small" href="/cbtc-collateral-desk-0.1.0.dar" download>
              Download DAR
            </a>
          </>
        )}
      </div>

      {networkInfo && (
        <p className="mono muted" style={{ marginTop: '0.5rem' }}>
          Wallet: {networkInfo}
        </p>
      )}
      {packageStatus && (
        <p className="mono muted" style={{ marginTop: '0.5rem' }}>
          DAR: {packageStatus}
        </p>
      )}

      <div className="form-inline">
        <label>
          AuthorizationProposal cid (advanced — optional)
          <input
            value={proposalCid}
            onChange={(e) => setProposalCid(e.target.value)}
            placeholder="leave blank: wallet creates AuthorizationGranted directly"
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
          <dt>Party ID</dt>
          <dd className="mono">
            {connectInfo.accounts.length
              ? connectInfo.accounts[0].partyId
              : '(none yet — whitelist / session)'}
          </dd>
          {connectInfo.accounts.length > 1 && (
            <>
              <dt>Other accounts</dt>
              <dd>
                {connectInfo.accounts
                  .slice(1)
                  .map((a) => a.partyId)
                  .join(', ')}
              </dd>
            </>
          )}
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
