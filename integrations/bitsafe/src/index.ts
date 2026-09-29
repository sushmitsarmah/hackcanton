export type {
  AppGovernanceStub,
  DecManClientConfig,
  DecManControl,
  DecManEvidencePayload,
  DecManMode,
  NodeConfigSnapshot,
  TopologyProposalStub,
  TxConfirmationStub,
} from './types.js'
export { loadDecManConfig, resolveDecManMode } from './config.js'
export {
  describeDeskTopologyOnboarding,
  scaffoldTopologyEvidence,
} from './topology.js'
export {
  listTxConfirmationHooks,
  scaffoldTxConfirmationEvidence,
} from './tx-confirmation.js'
export {
  describePartyOnboardingGovernance,
  describeProductParamGovernance,
  scaffoldAppGovernanceEvidence,
} from './app-governance.js'
export { DecManDeskClient, createDecManClient } from './client.js'
