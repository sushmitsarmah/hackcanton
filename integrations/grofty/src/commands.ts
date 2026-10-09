import type {
  AuthorizationGrantedArgs,
  AuthorizationProposalArgs,
  RequestAuthorizationArgs,
} from './types.js'

export const DEFAULT_AUTH_MODULE = '#cbtc-collateral-desk:Desk.Auth'

export function requestAuthorizationTemplateId(
  moduleId: string = DEFAULT_AUTH_MODULE,
): string {
  return `${moduleId}:RequestAuthorization`
}

export function authorizationProposalTemplateId(
  moduleId: string = DEFAULT_AUTH_MODULE,
): string {
  return `${moduleId}:AuthorizationProposal`
}

export function authorizationGrantedTemplateId(
  moduleId: string = DEFAULT_AUTH_MODULE,
): string {
  return `${moduleId}:AuthorizationGranted`
}

/** CIP-103 / JSON API CreateCommand for RequestAuthorization */
export function buildRequestAuthorizationCreate(
  args: RequestAuthorizationArgs,
  templateId: string = requestAuthorizationTemplateId(),
) {
  return {
    CreateCommand: {
      templateId,
      createArguments: {
        requester: args.requester,
        subject: args.subject,
        role: args.role,
        purpose: args.purpose,
      },
    },
  }
}

/** CIP-103 CreateCommand for AuthorizationProposal */
export function buildAuthorizationProposalCreate(
  args: AuthorizationProposalArgs,
  templateId: string = authorizationProposalTemplateId(),
) {
  return {
    CreateCommand: {
      templateId,
      createArguments: {
        requester: args.requester,
        authority: args.authority,
        subject: args.subject,
        role: args.role,
        purpose: args.purpose,
      },
    },
  }
}

/** CIP-103 ExerciseCommand for AuthorizationProposal.Grant */
export function buildGrantExercise(
  proposalContractId: string,
  templateId: string = authorizationProposalTemplateId(),
) {
  return {
    ExerciseCommand: {
      templateId,
      contractId: proposalContractId,
      choice: 'Grant',
      choiceArgument: {},
    },
  }
}

/**
 * CIP-103 CreateCommand for AuthorizationGranted.
 *
 * AuthorizationGranted has signatory == authority (Desk.Auth:93), so the Grofty
 * authority wallet can create the evidence directly — no CreditOfficer proposal
 * round-trip required. This is the primary live path for this desk.
 */
export function buildAuthorizationGrantedCreate(
  args: AuthorizationGrantedArgs,
  templateId: string = authorizationGrantedTemplateId(),
) {
  return {
    CreateCommand: {
      templateId,
      createArguments: {
        authority: args.authority,
        subject: args.subject,
        role: args.role,
        purpose: args.purpose,
      },
    },
  }
}
