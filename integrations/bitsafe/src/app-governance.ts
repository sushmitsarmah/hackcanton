/**
 * Control #3 — app governance (e.g. 2-of-3)
 * Maps to FUTURE(DecMan) in CreditApplication, Auth.
 */
import type { AppGovernanceStub, DecManEvidencePayload } from './types.js'

export function describeProductParamGovernance(): AppGovernanceStub {
  return {
    control: 'app-governance',
    subject: 'product-params',
    thresholdHint: '2-of-3 operators (example — set per party)',
    damlMarker: 'CreditApplication FUTURE(DecMan) app-governance approval of product parameters',
    workflow: [
      'Propose change to LoanTerms / AuthPolicy / fee params via DecMan governance module',
      'Peers confirm to threshold',
      'Execute; archive old params contract; create new',
      'Attach appGovernanceEvidence for audit',
    ],
    relatedRoutes: [
      'GET /governance/state',
      'POST /governance/confirm',
      'POST /governance/execute',
      'POST /governance/cancel',
      'POST /governance/expire',
    ],
  }
}

export function describePartyOnboardingGovernance(): AppGovernanceStub {
  return {
    control: 'app-governance',
    subject: 'party-onboarding',
    thresholdHint: '2-of-3 operators (example — set per party)',
    damlMarker: 'CreditApplication / Auth FUTURE(DecMan) party onboarding governance',
    workflow: [
      'Propose onboarding of borrower/lender/liquidator party references to Desk registry',
      'Confirm → execute membership / app-contract change',
      'Keep Grofty auth separate: Grofty never authorizes Desk signer',
    ],
    relatedRoutes: [
      'GET /governance/confirmations',
      'POST /governance/confirm',
      'POST /governance/execute',
    ],
  }
}

export function scaffoldAppGovernanceEvidence(
  prefix: string,
  subject: AppGovernanceStub['subject'],
): DecManEvidencePayload {
  return {
    control: 'app-governance',
    evidenceId: `${prefix}:gov:${subject}:scaffold-not-live`,
    summary: `Scaffold only — ${subject} governance not executed on a DecMan node`,
    networkClaim: 'scaffold',
    capturedAtIso: new Date().toISOString(),
  }
}
