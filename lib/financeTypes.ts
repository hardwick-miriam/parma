// Client-safe types for the Finances module. Kept separate from
// lib/db/finances.ts (which imports lib/supabase/server -> next/headers) so
// client components never pull a server-only module into the bundle.

export const ACCOUNT_TYPES = ['cash', 'investment', 'pension', 'crypto', 'other'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const DEBT_TYPES = ['loan', 'credit-card', 'other'] as const
export type DebtType = (typeof DEBT_TYPES)[number]

export interface FinanceAccount {
  id: string
  user_id: string
  name: string
  type: AccountType
  balance: number
  updated_on: string
  created_at: string
}

export interface FinanceDebt {
  id: string
  user_id: string
  name: string
  type: DebtType
  balance: number
  apr: number | null
  min_payment: number | null
  updated_on: string
  created_at: string
}

/** Months to clear a debt at a fixed monthly payment, accounting for APR interest — null if the payment never covers the interest (balance would never shrink). */
export function monthsToPayoff(balance: number, apr: number | null, monthlyPayment: number): number | null {
  if (balance <= 0) return 0
  if (monthlyPayment <= 0) return null
  const monthlyRate = (apr ?? 0) / 100 / 12
  if (monthlyRate === 0) return Math.ceil(balance / monthlyPayment)
  const interestOnly = balance * monthlyRate
  if (monthlyPayment <= interestOnly) return null // payment never reduces principal
  // Standard amortization formula: n = -log(1 - r*B/P) / log(1+r)
  const n = -Math.log(1 - (monthlyRate * balance) / monthlyPayment) / Math.log(1 + monthlyRate)
  return Math.ceil(n)
}
