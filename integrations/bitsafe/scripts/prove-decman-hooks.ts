#!/usr/bin/env npx tsx
/**
 * Prove DecMan hook scaffolding for CBTC Collateral Desk.
 *
 * Maps to FUTURE(DecMan) three controls — does NOT fake a live DecMan node.
 *
 *   cd integrations/bitsafe && npm run prove:scaffold
 *   DECMAN_MODE=http DECMAN_URL=http://localhost:8081 DECMAN_TOKEN=... npm run prove:http
 */

import { createDecManClient, resolveDecManMode } from '../src/index.js'

async function main(): Promise<void> {
  const mode = resolveDecManMode()
  console.log('=== CBTC Collateral Desk — BitSafe DecMan hooks prove ===')
  console.log(`DECMAN_MODE=${mode}`)
  console.log(
    'Controls: (1) topology ownership (2) tx confirmation (3) app governance',
  )
  console.log('Constraint: no fake live DecMan; scaffold ≠ Gold evidence')
  console.log('')

  const client = createDecManClient()
  const described = client.describeThreeControls()

  console.log('[1] Topology ownership workflow:')
  console.log(JSON.stringify(described.topology, null, 2))
  console.log('')

  console.log('[2] Tx confirmation hooks:')
  for (const hook of described.txConfirmation) {
    console.log(
      `  - ${hook.deskAction} threshold=${hook.requiresThreshold} :: ${hook.damlMarker}`,
    )
  }
  console.log('')

  console.log('[3] App governance:')
  for (const g of described.appGovernance) {
    console.log(`  - ${g.subject} :: ${g.damlMarker}`)
  }
  console.log('')

  console.log('Scaffold evidence payloads (NOT submittable as Gold):')
  console.log(JSON.stringify(described.scaffoldEvidence, null, 2))
  console.log('')
  console.log(described.warning)

  if (mode === 'http') {
    console.log('\nProbing real DecMan GET /node-config ...')
    const snap = await client.fetchNodeConfig()
    console.log(JSON.stringify(snap, null, 2))
    if (!snap.ok) {
      process.exitCode = 1
      console.error(
        'http mode failed — start DecMan or fix DECMAN_URL/TOKEN. Do not invent evidence.',
      )
      return
    }
    console.log(
      'Node reachable. Capture topology + governance trails per DecManEvidence.md for Gold/Contribution.',
    )
  } else {
    console.log(
      '\nNext: LocalNet DecMan via github.com/DLC-link/decentralization-manager OR Gold apply by ~4 Oct (buffer ~2 Oct).',
    )
    console.log('See BITSAFE.md and DecManEvidence.md.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
