/**
 * Control #1 — topology ownership
 * Maps to FUTURE(DecMan) in CollateralCustody, MockToken, Demo, Auth.
 */
import type { DecManEvidencePayload, TopologyProposalStub } from './types.js'

export function describeDeskTopologyOnboarding(
  deskPartyHint: string,
): TopologyProposalStub {
  return {
    control: 'topology-ownership',
    deskPartyHint,
    intendedHosts: [
      'participant-1 (coordinator)',
      'participant-2 (peer)',
      'participant-3 (peer, optional for 2-of-3)',
    ],
    thresholdPolicyHint: 'namespace owners m-of-n (configure per deployment; do not copy CBTC)',
    workflow: [
      'Connect DecMan peers (Noise) across Canton participants',
      'Generate local namespace / Daml keys on each host',
      'Coordinator assembles decentralized namespace + PartyToParticipant proposals',
      'Owners authorize; submit; wait for propagation on EVERY host',
      'Register Desk party as CBTC Holding holder / instrument admin as required',
      'Replace Demo.allocateParty stubs with topology-aware onboarding',
    ],
    relatedRoutes: [
      'GET /node-config',
      'GET /participants-status',
      'POST /onboarding (coordinator)',
      'GET /decentralized-parties',
      'GET /party-config/{id}',
    ],
  }
}

export function scaffoldTopologyEvidence(
  prefix: string,
  deskPartyHint: string,
): DecManEvidencePayload {
  return {
    control: 'topology-ownership',
    evidenceId: `${prefix}:topology:scaffold-not-live`,
    summary: `Scaffold only — propose Decentralized Party for ${deskPartyHint}; no topology submitted`,
    networkClaim: 'scaffold',
    capturedAtIso: new Date().toISOString(),
  }
}
