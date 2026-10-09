import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { AcceptStep } from './components/AcceptStep.tsx'
import { DisburseStep } from './components/DisburseStep.tsx'
import { EventLog } from './components/EventLog.tsx'
import { GroftyPanel } from './components/GroftyPanel.tsx'
import { LiquidateStep } from './components/LiquidateStep.tsx'
import { LockStep } from './components/LockStep.tsx'
import { ProposeStep } from './components/ProposeStep.tsx'
import { RepayStep } from './components/RepayStep.tsx'
import { BrandMark } from './components/BrandMark.tsx'
import { StatusPanel } from './components/StatusPanel.tsx'
import { StepNav } from './components/StepNav.tsx'
import { ChatPanel } from './chat/ChatPanel.tsx'
import { toDeskSnapshot } from './chat/deskSnapshot.ts'
import { useAiSelection, useAssistantConfig } from './chat/useAssistantConfig.ts'
import { positionSummary } from './lib/deskApi.ts'
import { useDeskApi } from './lib/useLedger.ts'
import type { GroftyMode } from './lib/groftyBrowser.ts'
import { brand } from './theme.ts'
import {
  INITIAL_POSITION,
  type DeskPosition,
  type FlowStepId,
  type LogEntry,
  type LoanTermsForm,
} from './types.ts'

function pushLog(
  setEntries: Dispatch<SetStateAction<LogEntry[]>>,
  level: LogEntry['level'],
  message: string,
) {
  setEntries((prev) => [
    ...prev,
    {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      level,
      message,
    },
  ])
}

function fmt(n: number | null | undefined, digits = 0): string {
  return n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

export default function App() {
  const { api, status: ledgerStatus } = useDeskApi()
  const [position, setPosition] = useState<DeskPosition>(INITIAL_POSITION)
  const [step, setStep] = useState<FlowStepId>('propose')
  const [busy, setBusy] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [groftyMode, setGroftyMode] = useState<GroftyMode>('mock')
  const [groftyEpoch, setGroftyEpoch] = useState(0)

  const refresh = useCallback(() => setPosition(api.get()), [api])

  // Stream detailed step telemetry from the ledger backend into the event log.
  useEffect(() => {
    const off = api.onEvent((e) => pushLog(setEntries, e.level, e.message))
    return off
  }, [api])

  const run = useCallback(
    async (label: string, fn: () => Promise<DeskPosition>, next?: FlowStepId) => {
      setBusy(true)
      const tag = api.backend === 'ledger' ? '[ledger]' : '[mock]'
      try {
        const p = await fn()
        setPosition({ ...p })
        pushLog(setEntries, 'ok', `${tag} ${label}`)
        if (next) setStep(next)
      } catch (e) {
        refresh()
        const msg = e instanceof Error ? e.message : String(e)
        pushLog(setEntries, 'error', `${label} failed: ${msg}`)
      } finally {
        setBusy(false)
      }
    },
    [refresh, api],
  )

  const onPropose = (terms: LoanTermsForm) =>
    run(
      `Proposed terms: ${terms.principal} USDCx / ${terms.collateralAmount} CBTC`,
      () => api.proposeTerms(terms),
      'accept',
    )

  const onLenderAccept = () =>
    run('Lender accepted proposal', () => api.lenderAccept())

  const onBorrowerAccept = () =>
    run('Borrower accepted → AcceptedTerms', () => api.borrowerAccept(), 'lock')

  const onLock = () =>
    run(
      'Locked CBTC + ReadyToDisburse (auth: desk.lock-collateral)',
      () => api.lockCollateral(),
      'disburse',
    )

  const onDisburse = () =>
    run(
      'Disbursed USDCx → active Loan (auth: desk.disburse)',
      () => api.disburse(),
      'repay',
    )

  const onRepay = () =>
    run('Full repay + ReleaseToBorrower (auth: desk.repay)', () => api.repay())

  const onLiquidate = () =>
    run(
      'Liquidate + SeizeToLiquidator (auth: desk.liquidate)',
      () => api.liquidate(),
    )

  const onStress = (price: number) => {
    const p = api.stressMarkPrice(price)
    setPosition({ ...p })
    if (p.lastError) {
      pushLog(setEntries, 'error', p.lastError)
    } else {
      const s = positionSummary(p)
      pushLog(
        setEntries,
        'warn',
        `Mark price → ${price.toLocaleString()} (HF ${s.hf?.toFixed(3) ?? '—'})`,
      )
    }
  }

  const onReset = () => {
    setPosition(api.reset())
    setStep('propose')
    setEntries([])
    pushLog(
      setEntries,
      'info',
      `Desk state reset (${api.backend === 'ledger' ? 'ledger' : 'mock'})`,
    )
  }

  const onGroftyModeChange = async (mode: GroftyMode) => {
    await api.setGroftyMode(mode)
    setGroftyMode(mode)
    setGroftyEpoch((n) => n + 1)
  }

  // The assistant snapshots the desk for each turn.
  const assistantConfig = useAssistantConfig()
  const [aiSelection, setAiSelection] = useAiSelection()
  const getDesk = useCallback(() => toDeskSnapshot(position, step), [position, step])

  // A confirmed proposal runs the SAME desk action the button runs.
  const onAssistantConfirm = useCallback(
    async (input: {
      tool: string
      args: Record<string, unknown>
      decision: 'confirm' | 'reject'
    }): Promise<{ text: string; route?: string }> => {
      if (input.decision === 'reject') {
        pushLog(setEntries, 'info', 'Assistant action cancelled')
        return { text: 'Cancelled — nothing was changed.' }
      }
      try {
        if (input.tool === 'propose_terms') {
          const a = input.args
          const terms: LoanTermsForm = {
            principal: Number(a.principal),
            interestRate: Number(a.interestRate),
            collateralAmount: Number(a.collateralAmount),
            collateralPrice: Number(a.collateralPrice),
            liquidationThreshold: Number(a.liquidationThreshold),
            maxLtv: Number(a.maxLtv),
            maturityDays: Number(a.maturityDays),
          }
          await onPropose(terms)
          return { text: 'Terms proposed.', route: 'accept' }
        }
        if (input.tool === 'desk_action') {
          const action = String(input.args.action)
          if (action === 'lender_accept') {
            await onLenderAccept()
            return { text: 'Lender accepted.' }
          }
          if (action === 'borrower_accept') {
            await onBorrowerAccept()
            return { text: 'Borrower accepted — AcceptedTerms created.', route: 'lock' }
          }
          if (action === 'lock') {
            await onLock()
            return { text: 'CBTC locked; ready to disburse.', route: 'disburse' }
          }
          if (action === 'disburse') {
            await onDisburse()
            return { text: 'USDCx disbursed; loan active.', route: 'repay' }
          }
          if (action === 'repay') {
            await onRepay()
            return { text: 'Loan repaid; collateral released.' }
          }
          if (action === 'liquidate') {
            if (input.args.stressPrice != null) onStress(Number(input.args.stressPrice))
            await onLiquidate()
            return { text: 'Position liquidated; collateral seized.' }
          }
        }
        return { text: 'Action not recognised.' }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return { text: `Failed: ${msg}` }
      }
    },
    // Handlers below are stable enough for the assistant's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const summary = positionSummary(position)
  const terms = position.terms

  return (
    <div className="desk">
      <header className="topbar">
        <a className="brand" href="#/">
          <BrandMark /> {brand.nameUpper}
        </a>
        <div className="connection">
          <i /> Canton <i className="cyan" /> Grofty{' '}
          <b>{groftyMode === 'live' ? 'Live' : 'Mock'}</b>
        </div>
        <button className="user" type="button" onClick={onReset} disabled={busy}>
          ♙ &nbsp; Credit Officer
        </button>
      </header>

      <main>
        <div className="heading">
          <div>
            <p className="eyebrow">CREDIT OPERATIONS</p>
            <h1>{brand.product}</h1>
            <p>Review, manage and settle bilateral CBTC loans on Canton.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div className="badges">
              <span className={`badge ${groftyMode === 'live' ? '' : 'badge-muted'}`}>
                GROFTY_MODE={groftyMode}
              </span>
              <span
                className={`badge ${ledgerStatus === 'live' ? '' : 'badge-muted'}`}
                title={
                  ledgerStatus === 'live'
                    ? 'Submitting real commands to the Canton JSON Ledger API'
                    : 'In-memory mock (no ledger reachable)'
                }
              >
                {ledgerStatus === 'checking'
                  ? 'Ledger: checking…'
                  : ledgerStatus === 'live'
                    ? 'Ledger: live (/v2)'
                    : 'Ledger: mock'}
              </span>
            </div>
            <button type="button" className="button" onClick={onReset} disabled={busy}>
              Reset demo
            </button>
          </div>
        </div>

        <StepNav phase={position.phase} current={step} onSelect={setStep} />

        <section className="loan-card">
          <div className="loan-title">
            <div>
              <span className="muted">CIP-103</span> / Bilateral Loan #103{' '}
              <em>{position.phase}</em>
            </div>
          </div>
          <div className="loan-data">
            <div>
              <label>Borrower</label>
              <strong>{api.parties.borrower.split('::')[0]}</strong>
              <small>{api.parties.borrower.slice(0, 18)}…</small>
            </div>
            <div>
              <label>Lender</label>
              <strong>{api.parties.lender.split('::')[0]}</strong>
              <small>{api.parties.lender.slice(0, 18)}…</small>
            </div>
            <div>
              <label>Principal (USDCx)</label>
              <strong>{fmt(terms?.principal)}</strong>
            </div>
            <div>
              <label>Interest rate (annual)</label>
              <strong>{terms ? `${(terms.interestRate * 100).toFixed(0)}%` : '—'}</strong>
            </div>
            <div>
              <label>Collateral (CBTC)</label>
              <strong>{terms ? terms.collateralAmount : '—'}</strong>
            </div>
            <div>
              <label>Max LTV</label>
              <strong>{terms ? `${(terms.maxLtv * 100).toFixed(0)}%` : '—'}</strong>
            </div>
            <div>
              <label>Liquidation threshold</label>
              <strong>
                {terms ? `${(terms.liquidationThreshold * 100).toFixed(0)}%` : '—'}
              </strong>
            </div>
            <div>
              <label>Term</label>
              <strong>{terms ? `${terms.maturityDays} days` : '—'}</strong>
            </div>
          </div>
        </section>

        <div className="layout">
          <section>
            <GroftyPanel
              key={groftyEpoch}
              mode={groftyMode}
              client={api.getGrofty()}
              parties={api.parties}
              busy={busy}
              onModeChange={onGroftyModeChange}
              onLog={(level, message) => pushLog(setEntries, level, message)}
            />

            {step === 'propose' && (
              <ProposeStep
                disabled={position.phase !== 'idle' && position.phase !== 'proposed'}
                busy={busy}
                initial={position.terms}
                onPropose={onPropose}
              />
            )}
            {step === 'accept' && (
              <AcceptStep
                phase={position.phase}
                busy={busy}
                onLenderAccept={onLenderAccept}
                onBorrowerAccept={onBorrowerAccept}
              />
            )}
            {step === 'lock' && (
              <LockStep
                ready={position.phase === 'accepted'}
                done={
                  position.phase === 'locked' ||
                  position.phase === 'disbursed' ||
                  position.phase === 'repaid' ||
                  position.phase === 'liquidated'
                }
                busy={busy}
                collateralAmount={position.terms?.collateralAmount ?? null}
                onLock={onLock}
              />
            )}
            {step === 'disburse' && (
              <DisburseStep
                ready={position.phase === 'locked'}
                done={
                  position.phase === 'disbursed' ||
                  position.phase === 'repaid' ||
                  position.phase === 'liquidated'
                }
                busy={busy}
                principal={position.terms?.principal ?? null}
                onDisburse={onDisburse}
              />
            )}
            {step === 'repay' && (
              <RepayStep
                ready={position.phase === 'disbursed'}
                done={position.phase === 'repaid'}
                closedOther={position.phase === 'liquidated'}
                busy={busy}
                debt={summary.debt}
                onRepay={onRepay}
              />
            )}
            {step === 'liquidate' && (
              <LiquidateStep
                ready={position.phase === 'disbursed'}
                done={position.phase === 'liquidated'}
                closedOther={position.phase === 'repaid'}
                busy={busy}
                markPrice={position.markPrice}
                onStress={onStress}
                onLiquidate={onLiquidate}
              />
            )}

            <section className="panel note-panel">
              <h2>Ledger API (later)</h2>
              <p className="muted">
                This UI drives <code>src/lib/deskApi.ts</code> local state. Each
                action is annotated with the Daml choice it will call. Wire to
                Canton JSON Ledger API / participant commands without changing the
                step UX — see <code>ui/README.md</code>. Live Grofty Grant still
                needs Desk DAR + ACS cid on a real synchronizer.
              </p>
            </section>
          </section>

          <aside>
            <StatusPanel position={position} parties={api.parties} />
            <EventLog entries={entries} />
          </aside>
        </div>
      </main>

      <ChatPanel
        config={assistantConfig}
        getDesk={getDesk}
        selection={aiSelection}
        onSelectionChange={setAiSelection}
        onNavigate={(s) => setStep(s as FlowStepId)}
        onConfirm={onAssistantConfirm}
      />
    </div>
  )
}
