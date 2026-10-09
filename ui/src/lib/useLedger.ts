import { useEffect, useState } from 'react'
import { LedgerClient } from './ledgerClient.ts'
import { createLedgerDeskApi } from './ledgerDeskApi.ts'
import { createDeskApi, type DeskApi } from './deskApi.ts'
import { DEFAULT_PARTIES, type DeskParties } from '../types.ts'

export type LedgerStatus = 'checking' | 'live' | 'mock'

/**
 * Detect a running Canton JSON Ledger API and, when present, build a
 * ledger-backed DeskApi using the on-ledger party ids. Otherwise fall back to
 * the in-memory mock. The console renders identically either way.
 */
export function useDeskApi(): {
  api: DeskApi
  status: LedgerStatus
  parties: DeskParties
} {
  const [status, setStatus] = useState<LedgerStatus>('checking')
  const [api, setApi] = useState<DeskApi>(() => createDeskApi(DEFAULT_PARTIES, 'mock'))
  const parties = api.parties

  useEffect(() => {
    let alive = true
    const ledger = new LedgerClient()
    ;(async () => {
      const ok = await ledger.ping()
      if (!alive) return
      if (!ok) {
        setStatus('mock')
        return
      }
      try {
        const byHint = await ledger.parties()
        const need = ['CreditOfficer', 'Lender', 'Borrower', 'Liquidator', 'MockIssuer', 'GroftyAuth']
        const resolved: Partial<Record<string, string>> = {}
        for (const hint of need) {
          resolved[hint] = byHint[hint] ?? (await ledger.allocateParty(hint))
        }
        const ledgerParties: DeskParties = {
          creditOfficer: resolved.CreditOfficer!,
          lender: resolved.Lender!,
          borrower: resolved.Borrower!,
          liquidator: resolved.Liquidator!,
          issuer: resolved.MockIssuer!,
          authAuthority: resolved.GroftyAuth!,
        }
        if (!alive) return
        setApi(createLedgerDeskApi(ledgerParties, ledger, 'mock'))
        setStatus('live')
      } catch {
        if (alive) setStatus('mock')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return { api, status, parties }
}
