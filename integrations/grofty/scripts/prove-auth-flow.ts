#!/usr/bin/env npx tsx
/**
 * Smallest custom-choice path for Grofty ↔ Desk.Auth
 *
 * Flow (matches daml/Desk/Auth.daml):
 *   1. CreditOfficer creates RequestAuthorization (async notice to subject)
 *   2. CreditOfficer creates AuthorizationProposal (observer: authority=Grofty, subject)
 *   3. Authority (Grofty wallet / mock) exercises Grant → AuthorizationGranted
 *
 * Roles authorized: BorrowerRole | LenderRole | LiquidatorRole ONLY — never Desk signer.
 *
 * Usage:
 *   cd integrations/grofty && npm run prove:mock
 *   # Live prove: open ui (npm run dev), toggle GROFTY_MODE=live, use Grofty panel
 *   #   RequestAuthorization → Grant via prepareExecute when extension present
 *   GROFTY_MODE=live npm run prove   # Node exits 2 — browser only
 */

import {
  ALL_DESK_PURPOSES,
  PURPOSE_DISBURSE,
  PURPOSE_LIQUIDATE,
  PURPOSE_LOCK,
  PURPOSE_REPAY,
  createGroftyClient,
  resolveGroftyMode,
  type AuthRole,
  type AuthorizationProposalArgs,
} from '../src/index.js'
import { MockGroftyClient } from '../src/mock-adapter.js'

const mode = resolveGroftyMode()

async function main(): Promise<void> {
  console.log('=== CBTC Collateral Desk — Grofty auth prove ===')
  console.log(`GROFTY_MODE=${mode}`)
  console.log('Purposes:', ALL_DESK_PURPOSES.join(', '))
  console.log(
    'Constraint: Grofty authorizes borrower/lender/liquidator ONLY — NOT Desk signer',
  )
  console.log('')

  if (mode === 'live') {
    console.log(
      'LIVE mode selected. This Node script cannot open a browser wallet picker.',
    )
    console.log('Browser prove path (operator UI):')
    console.log('  cd ../../ui && npm install && npm run dev')
    console.log('  → toggle Grofty mode to Live → Connect → Prove RequestAuthorization')
    console.log('  → paste AuthorizationProposal cid → Grant via prepareExecute')
    console.log('Requires: Grofty extension + whitelist (see GROFTY.md).')
    console.log('Exit: live prove must run in-page after Grofty whitelist + connect.')
    process.exitCode = 2
    return
  }

  const client = createGroftyClient({ mode: 'mock' })
  const connected = await client.connect()
  console.log('Connected:', connected)

  const requester = 'CreditOfficer::1220MOCKDESK000000000000000000000000000000'
  const subjectBorrower =
    connected.accounts.find((a) => a.hint === 'mock-borrower')?.partyId ??
    'Borrower::mock'
  const authority =
    connected.accounts.find((a) => a.hint === 'mock-grofty-authority')?.partyId ??
    'GroftyAuth::mock'

  // Step 1: RequestAuthorization (async)
  const req = await client.requestAuthorization({
    requester,
    subject: subjectBorrower,
    role: 'BorrowerRole',
    purpose: PURPOSE_LOCK,
  })
  console.log('\n[1] RequestAuthorization CreateCommand:')
  console.log(JSON.stringify(req.command, null, 2))
  console.log('submit result:', req.result)

  // Step 2–3: Proposal + Grant for each money-moving purpose
  const grants: Array<{ role: AuthRole; purpose: string; subject: string }> = [
    { role: 'BorrowerRole', purpose: PURPOSE_LOCK, subject: subjectBorrower },
    { role: 'BorrowerRole', purpose: PURPOSE_DISBURSE, subject: subjectBorrower },
    { role: 'BorrowerRole', purpose: PURPOSE_REPAY, subject: subjectBorrower },
    {
      role: 'LenderRole',
      purpose: PURPOSE_DISBURSE,
      subject:
        connected.accounts.find((a) => a.hint === 'mock-lender')?.partyId ??
        'Lender::mock',
    },
    {
      role: 'LiquidatorRole',
      purpose: PURPOSE_LIQUIDATE,
      subject:
        connected.accounts.find((a) => a.hint === 'mock-liquidator')?.partyId ??
        'Liquidator::mock',
    },
  ]

  console.log('\n[2–3] Authority signs AuthorizationGranted (mock authority):')
  for (const g of grants) {
    const args: AuthorizationProposalArgs = {
      requester,
      authority,
      subject: g.subject,
      role: g.role,
      purpose: g.purpose,
    }
    if (client instanceof MockGroftyClient) {
      console.log('\n  Proposal create:', JSON.stringify(client.buildProposalCreate(args)))
    }
    // Authority wallet creates AuthorizationGranted directly (signatory = authority).
    const payload = await client.authorizeSubject(args)
    console.log('  AuthorizationGranted payload:', JSON.stringify(payload, null, 2))
  }

  console.log('\n=== Prove complete (mock) ===')
  console.log('Offline: authority grant create works without extension.')
  console.log('Needs whitelist / extension:')
  console.log('  1. Install Grofty (https://grofty.cc/download) id ojlgdkgfbpkjceancgnniegbgadgmhig')
  console.log('  2. Whitelist onboarding (https://grofty.cc/docs/quick-start) → copy Party ID')
  console.log('  3. Upload Desk DAR to target synchronizer')
  console.log('  4. UI: Live mode → Connect → RequestAuthorization → Grant')
  console.log('     (wallet creates AuthorizationGranted; cid discovered via ACS)')
  console.log('  5. Daml policy: productionAuthWith authority → binds grants to the wallet signer')

  await client.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
