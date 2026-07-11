import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getLocalDate } from '@/lib/date'
import type { AccountType, DebtType, FinanceAccount, FinanceDebt } from '@/lib/financeTypes'

export { ACCOUNT_TYPES, DEBT_TYPES, monthsToPayoff, type AccountType, type DebtType, type FinanceAccount, type FinanceDebt } from '@/lib/financeTypes'

export interface FinanceSnapshot {
  id: string
  user_id: string
  snapshot_date: string
  total_assets: number
  total_debts: number
  net_worth: number
  created_at: string
}

export async function getFinanceAccounts(userId: string, client?: SupabaseClient): Promise<FinanceAccount[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase.from('finance_accounts').select('*').eq('user_id', userId).order('name')
  if (error) throw error
  return data ?? []
}

export async function getFinanceDebts(userId: string, client?: SupabaseClient): Promise<FinanceDebt[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase.from('finance_debts').select('*').eq('user_id', userId).order('name')
  if (error) throw error
  return data ?? []
}

export async function getFinanceSnapshots(userId: string, days = 365, client?: SupabaseClient): Promise<FinanceSnapshot[]> {
  const supabase = client ?? (await createClient())
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('finance_snapshots')
    .select('*')
    .eq('user_id', userId)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Recomputes today's net-worth snapshot from ALL current accounts/debts — call after any balance change. */
export async function snapshotNetWorth(userId: string, client?: SupabaseClient): Promise<void> {
  const supabase = client ?? (await createClient())
  const [accounts, debts] = await Promise.all([
    getFinanceAccounts(userId, supabase),
    getFinanceDebts(userId, supabase),
  ])
  const totalAssets = accounts.reduce((s, a) => s + Number(a.balance), 0)
  const totalDebts = debts.reduce((s, d) => s + Number(d.balance), 0)
  const { error } = await supabase
    .from('finance_snapshots')
    .upsert(
      { user_id: userId, snapshot_date: getLocalDate(), total_assets: totalAssets, total_debts: totalDebts, net_worth: totalAssets - totalDebts },
      { onConflict: 'user_id,snapshot_date' }
    )
  if (error) throw error
}

export async function createFinanceAccount(
  userId: string,
  name: string,
  type: AccountType,
  balance: number,
  client?: SupabaseClient
): Promise<FinanceAccount> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('finance_accounts')
    .insert({ user_id: userId, name, type, balance, updated_on: getLocalDate() })
    .select('*')
    .single()
  if (error) throw error
  await snapshotNetWorth(userId, supabase)
  return data
}

export async function updateFinanceAccount(
  userId: string,
  id: string,
  updates: Partial<Pick<FinanceAccount, 'name' | 'type' | 'balance'>>,
  client?: SupabaseClient
): Promise<FinanceAccount> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('finance_accounts')
    .update({ ...updates, updated_on: getLocalDate() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  await snapshotNetWorth(userId, supabase)
  return data
}

export async function deleteFinanceAccount(userId: string, id: string, client?: SupabaseClient): Promise<void> {
  const supabase = client ?? (await createClient())
  const { error } = await supabase.from('finance_accounts').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
  await snapshotNetWorth(userId, supabase)
}

export async function createFinanceDebt(
  userId: string,
  name: string,
  type: DebtType,
  balance: number,
  apr?: number,
  minPayment?: number,
  client?: SupabaseClient
): Promise<FinanceDebt> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('finance_debts')
    .insert({ user_id: userId, name, type, balance, apr: apr ?? null, min_payment: minPayment ?? null, updated_on: getLocalDate() })
    .select('*')
    .single()
  if (error) throw error
  await snapshotNetWorth(userId, supabase)
  return data
}

export async function updateFinanceDebt(
  userId: string,
  id: string,
  updates: Partial<Pick<FinanceDebt, 'name' | 'type' | 'balance' | 'apr' | 'min_payment'>>,
  client?: SupabaseClient
): Promise<FinanceDebt> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('finance_debts')
    .update({ ...updates, updated_on: getLocalDate() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  await snapshotNetWorth(userId, supabase)
  return data
}

export async function deleteFinanceDebt(userId: string, id: string, client?: SupabaseClient): Promise<void> {
  const supabase = client ?? (await createClient())
  const { error } = await supabase.from('finance_debts').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
  await snapshotNetWorth(userId, supabase)
}

/**
 * Finds a finance account OR debt by fuzzy (case-insensitive substring) name
 * match for NLP balance updates — "Monzo balance 1240", "paid £200 off the loan".
 */
export async function findAccountOrDebtByName(
  userId: string,
  name: string,
  client?: SupabaseClient
): Promise<{ kind: 'account' | 'debt'; row: FinanceAccount | FinanceDebt } | null> {
  const supabase = client ?? (await createClient())
  const [accounts, debts] = await Promise.all([getFinanceAccounts(userId, supabase), getFinanceDebts(userId, supabase)])
  const q = name.toLowerCase().trim()
  const account = accounts.find((a) => a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase()))
  if (account) return { kind: 'account', row: account }
  const debt = debts.find((d) => d.name.toLowerCase().includes(q) || q.includes(d.name.toLowerCase()))
  if (debt) return { kind: 'debt', row: debt }
  return null
}
