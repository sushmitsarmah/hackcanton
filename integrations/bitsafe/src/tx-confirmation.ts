/**
 * Control #2 — transaction confirmation / hosting threshold
 * Maps to FUTURE(DecMan) in Loan, CollateralCustody, Auth.
 */
import type { DecManEvidencePayload, TxConfirmationStub } from './types.js'

const ACTIONS: TxConfirmationStub[] = [
  {
    control: 'tx-confirmation',
    deskAction: 'lock',
    requiresThreshold: true,
    damlMarker: 'CollateralCustody FUTURE(DecMan) control #2; Auth evidence',
    workflow: [
      'Propose governed lock of CBTC into Desk vault',
      'Peers confirm to threshold',
      'Execute; attach txConfirmationEvidence to AuthorizationGranted / audit log',
    ],
    relatedRoutes: [
      'GET /governance/state',
      'GET /governance/confirmations',
      'POST /governance/confirm',
      'POST /governance/execute',
    ],
  },
  {
    control: 'tx-confirmation',
    deskAction: 'release',
    requiresThreshold: true,
    damlMarker: 'CollateralVault.RequestGovernedCustodyRelease FUTURE(DecMan) gated release',
    workflow: [
      'Propose release after repay',
      'Confirm → execute',
      'Assert bypass without confirmation fails',
    ],
    relatedRoutes: [
      'POST /governance/confirm',
      'POST /governance/execute',
    ],
  },
  {
    control: 'tx-confirmation',
    deskAction: 'seize',
    requiresThreshold: true,
    damlMarker: 'CollateralVault.RequestGovernedCustodyRelease FUTURE(DecMan) gated admin-seize',
    workflow: [
      'Gated seize via DecMan confirmation when using governed enforcement path',
    ],
    relatedRoutes: [
      'POST /governance/confirm',
      'POST /governance/execute',
    ],
  },
  {
    control: 'tx-confirmation',
    deskAction: 'disburse',
    requiresThreshold: true,
    damlMarker: 'Loan.Disburse FUTURE(DecMan) tx confirmation',
    workflow: [
      'Propose USDCx disburse from prefunded lender holding',
      'Confirm → execute settlement',
    ],
    relatedRoutes: [
      'POST /governance/confirm',
      'POST /governance/execute',
    ],
  },
  {
    control: 'tx-confirmation',
    deskAction: 'liquidate-gated',
    requiresThreshold: true,
    damlMarker: 'RequestGovernedCustodyRelease FUTURE(DecMan) gated path (not LiquidateFast)',
    workflow: [
      'Governed liquidation settlement under threshold',
      'Record confirmation latency for outage design',
    ],
    relatedRoutes: [
      'POST /governance/confirm',
      'POST /governance/execute',
    ],
  },
  {
    control: 'tx-confirmation',
    deskAction: 'liquidate-fast',
    requiresThreshold: false,
    damlMarker: 'Loan.LiquidateFast pre-authorized liquidator fast path (plan §5.3)',
    workflow: [
      'Pre-authorized liquidator path remains available',
      'Do NOT block emergency seize solely on DecMan threshold delay',
      'Document gated vs fast paths in demo script',
    ],
    relatedRoutes: [],
  },
]

export function listTxConfirmationHooks(): TxConfirmationStub[] {
  return ACTIONS
}

export function scaffoldTxConfirmationEvidence(
  prefix: string,
  deskAction: TxConfirmationStub['deskAction'],
): DecManEvidencePayload {
  return {
    control: 'tx-confirmation',
    evidenceId: `${prefix}:tx:${deskAction}:scaffold-not-live`,
    summary: `Scaffold only — ${deskAction} confirmation workflow not executed on a DecMan node`,
    networkClaim: 'scaffold',
    capturedAtIso: new Date().toISOString(),
  }
}
