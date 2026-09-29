/**
 * Canonical Desk.Auth purposes — must stay in sync with daml/Desk/Auth.daml.
 * Grofty may authorize Borrower / Lender / Liquidator only — never Desk signer.
 */

export const PURPOSE_LOCK = 'desk.lock-collateral' as const
export const PURPOSE_DISBURSE = 'desk.disburse' as const
export const PURPOSE_ADD_COLLATERAL = 'desk.add-collateral' as const
export const PURPOSE_REPAY = 'desk.repay' as const
export const PURPOSE_LIQUIDATE = 'desk.liquidate' as const

/** Release/Seize share repay/liquidate purposes (see Auth.daml). */
export const PURPOSE_RELEASE = PURPOSE_REPAY
export const PURPOSE_SEIZE = PURPOSE_LIQUIDATE

export type DeskAuthPurpose =
  | typeof PURPOSE_LOCK
  | typeof PURPOSE_DISBURSE
  | typeof PURPOSE_ADD_COLLATERAL
  | typeof PURPOSE_REPAY
  | typeof PURPOSE_LIQUIDATE

export const ALL_DESK_PURPOSES: readonly DeskAuthPurpose[] = [
  PURPOSE_LOCK,
  PURPOSE_DISBURSE,
  PURPOSE_ADD_COLLATERAL,
  PURPOSE_REPAY,
  PURPOSE_LIQUIDATE,
] as const

export type AuthRole = 'BorrowerRole' | 'LenderRole' | 'LiquidatorRole'

export function assertNotDeskSignerRole(role: AuthRole): void {
  // Desk/CreditOfficer is intentionally excluded from AuthRole union.
  void role
}

export function purposeForMoneyMovingChoice(
  choice:
    | 'Lock'
    | 'Disburse'
    | 'AddCollateral'
    | 'Repay'
    | 'Liquidate'
    | 'ReleaseToBorrower'
    | 'SeizeToLiquidator',
): DeskAuthPurpose {
  switch (choice) {
    case 'Lock':
      return PURPOSE_LOCK
    case 'Disburse':
      return PURPOSE_DISBURSE
    case 'AddCollateral':
      return PURPOSE_ADD_COLLATERAL
    case 'Repay':
    case 'ReleaseToBorrower':
      return PURPOSE_REPAY
    case 'Liquidate':
    case 'SeizeToLiquidator':
      return PURPOSE_LIQUIDATE
  }
}
