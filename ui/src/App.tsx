import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { AcceptStep } from './components/AcceptStep.tsx'
import { DisburseStep } from './components/DisburseStep.tsx'
import { EventLog } from './components/EventLog.tsx'
import { GroftyPanel } from './components/GroftyPanel.tsx'
import { LiquidateStep } from './components/LiquidateStep.tsx'
import { LockStep } from './components/LockStep.tsx'
import { ProposeStep } from './components/ProposeStep.tsx'
import { RepayStep } from './components/RepayStep.tsx'
import { StatusPanel } from './components/StatusPanel.tsx'
import { StepNav } from './components/StepNav.tsx'
import { createDeskApi, positionSummary } from './lib/deskApi.ts'
import type { GroftyMode } from './lib/groftyBrowser.ts'
import {
  DEFAULT_PARTIES,
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

export default function App() {
  const api = useMemo(() => createDeskApi(DEFAULT_PARTIES, 'mock'), [])
  const [position, setPosition] = useState<DeskPosition>(INITIAL_POSITION)
  const [step, setStep] = useState<FlowStepId>('propose')
  const [busy, setBusy] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [groftyMode, setGroftyMode] = useState<GroftyMode>('mock')
  const [groftyEpoch, setGroftyEpoch] = useState(0)

  const refresh = useCallback(() => setPosition(api.get()), [api])

  const run = useCallback(
    async (label: string, fn: () => Promise<DeskPosition>, next?: FlowStepId) => {
      setBusy(true)
      try {
        const p = await fn()
        setPosition({ ...p })
        pushLog(setEntries, 'ok', label)
        if (next) setStep(next)
      } catch (e) {
        refresh()
        const msg = e instanceof Error ? e.message : String(e)
        pushLog(setEntries, 'error', `${label} failed: ${msg}`)
      } finally {
        setBusy(false)
      }
    },
    [refresh],
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
    run(
      'Borrower accepted → AcceptedTerms',
      () => api.borrowerAccept(),
      'lock',
    )

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
    pushLog(setEntries, 'info', 'Desk state reset (local mock)')
  }

  const onGroftyModeChange = async (mode: GroftyMode) => {
    await api.setGroftyMode(mode)
    setGroftyMode(mode)
    setGroftyEpoch((n) => n + 1)
  }

  const summary = positionSummary(position)

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">HackCanton · CBTC Collateral Desk</p>
          <h1>Credit officer console</h1>
          <p className="subtitle">
            Bilateral propose → accept → lock → disburse → repay / liquidate
            (local mock ledger + Grofty mock/live CIP-103)
          </p>
        </div>
        <div className="header-actions">
          <span className={`badge ${groftyMode === 'live' ? '' : 'badge-muted'}`}>
            GROFTY_MODE={groftyMode}
          </span>
          <span className="badge badge-muted">Ledger API: not wired</span>
          <button type="button" onClick={onReset} disabled={busy}>
            Reset demo
          </button>
        </div>
      </header>

      <StepNav phase={position.phase} current={step} onSelect={setStep} />

      <div className="layout">
        <main>
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
              disabled={
                position.phase !== 'idle' && position.phase !== 'proposed'
              }
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
              needs Desk DAR + ACS proposal cid on a real synchronizer.
            </p>
          </section>
        </main>

        <aside>
          <StatusPanel position={position} parties={api.parties} />
          <EventLog entries={entries} />
        </aside>
      </div>
    </div>
  )
}
