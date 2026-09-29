import type { Debt, LoanTermsForm } from '../types.ts'

export function debtTotal(d: Debt): number {
  return d.principalOutstanding + d.accruedInterest
}

export function collateralValue(amount: number, price: number): number {
  return amount * price
}

/** HF = CollateralValue × LiquidationThreshold / Debt (Desk.Types) */
export function healthFactor(
  collAmount: number,
  collPrice: number,
  liqThreshold: number,
  debt: Debt,
): number {
  const d = debtTotal(debt)
  if (d <= 0) return 999_999
  return (collateralValue(collAmount, collPrice) * liqThreshold) / d
}

export function loanToValue(
  collAmount: number,
  collPrice: number,
  debt: Debt,
): number {
  const cv = collateralValue(collAmount, collPrice)
  if (cv <= 0) return 999_999
  return debtTotal(debt) / cv
}

export function isHfBreached(
  collAmount: number,
  collPrice: number,
  liqThreshold: number,
  debt: Debt,
): boolean {
  return healthFactor(collAmount, collPrice, liqThreshold, debt) < 1
}

export function validateTerms(t: LoanTermsForm): string | null {
  if (!(t.principal > 0)) return 'Principal must be > 0'
  if (!(t.interestRate >= 0)) return 'Interest rate must be ≥ 0'
  if (!(t.collateralAmount > 0)) return 'Collateral amount must be > 0'
  if (!(t.collateralPrice > 0)) return 'Collateral price must be > 0'
  if (!(t.liquidationThreshold > 0 && t.liquidationThreshold <= 1))
    return 'Liquidation threshold must be in (0, 1]'
  if (!(t.maxLtv > 0 && t.maxLtv < t.liquidationThreshold))
    return 'maxLtv must be > 0 and strictly below liquidationThreshold'
  if (!(t.maturityDays > 0)) return 'Maturity days must be > 0'
  const cv = collateralValue(t.collateralAmount, t.collateralPrice)
  const ltvAtOrigination = t.principal / cv
  if (ltvAtOrigination > t.maxLtv)
    return `Origination LTV ${ltvAtOrigination.toFixed(3)} exceeds maxLtv ${t.maxLtv}`
  return null
}

export function fmtNum(n: number, digits = 2): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}
