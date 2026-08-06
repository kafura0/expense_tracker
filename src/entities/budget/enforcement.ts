import type { SupabaseClient } from '@supabase/supabase-js'
import { sumInBaseCurrency } from '@/entities/expense/totals'
import { fetchBaseRates } from '@/entities/exchange-rate/base-rates'
import { formatMoney } from '@/shared/lib/currency'

export interface BudgetEnforcementInput {
  userId: string
  orgId: string | null
  categoryId: string | null
  amountCents: number
  currency: string
  entryType: 'expense' | 'income'
  /** ISO timestamp of the expense (scopes the month window). */
  date: string
  /** Stored converted value, used as a fallback when a live rate is missing. */
  convertedAmountCents?: number | null
  convertedCurrency?: string | null
  /** Exclude this expense id from the month's spent total (for edits). */
  excludeExpenseId?: string
}

/** Pure decision: does adding this expense push the category over budget? */
export function wouldExceedBudget(budgetCents: number, spentCents: number, newAmountCents: number): boolean {
  if (budgetCents <= 0) return false
  return newAmountCents > budgetCents - spentCents
}

/** Pure message builder, exported for unit testing. */
export function buildBudgetMessage(
  budgetCents: number,
  spentCents: number,
  newCents: number,
  currency: string,
  categoryName: string
): string {
  return (
    `"${categoryName}" is at its ${formatMoney(budgetCents, currency)} monthly budget ` +
    `(${formatMoney(spentCents, currency)} spent). This ${formatMoney(newCents, currency)} would exceed it. ` +
    'Raise the budget or use a different category.'
  )
}

export class BudgetExceededError extends Error {
  readonly categoryId: string
  readonly budgetCents: number
  readonly spentCents: number
  readonly newCents: number

  constructor(categoryId: string, budgetCents: number, spentCents: number, newCents: number, currency: string, categoryName: string) {
    super(buildBudgetMessage(budgetCents, spentCents, newCents, currency, categoryName))
    this.name = 'BudgetExceededError'
    this.categoryId = categoryId
    this.budgetCents = budgetCents
    this.spentCents = spentCents
    this.newCents = newCents
  }
}

async function resolveBaseCurrency(
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null
): Promise<string> {
  if (orgId) {
    const [{ data: settings }, { data: org }] = await Promise.all([
      supabase
        .from('settings')
        .select('base_currency')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .maybeSingle(),
      supabase
        .from('organizations')
        .select('default_currency')
        .eq('id', orgId)
        .maybeSingle(),
    ])
    return settings?.base_currency || org?.default_currency || 'USD'
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('base_currency')
    .eq('user_id', userId)
    .is('org_id', null)
    .maybeSingle()
  return settings?.base_currency || 'USD'
}

function monthWindow(date: string): { from: string; to: string } {
  const d = new Date(date)
  const from = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString() }
}

/**
 * Server-side budget guard for expense writes.
 *
 * Throws a `BudgetExceededError` when the new expense would push its category
 * over the configured budget for the expense's month. Income entries and
 * uncategorized expenses never count against budgets. Spent totals are
 * converted into the effective base currency, mirroring the monthly figures
 * shown on the Categories page.
 *
 * The check runs at the application layer. RLS remains the authoritative data
 * boundary; the read-spent → write window is narrow but not transactional, so
 * near-simultaneous writes could still race past the limit.
 */
export async function assertCategoryBudget(
  supabase: SupabaseClient,
  input: BudgetEnforcementInput
): Promise<void> {
  if (input.entryType !== 'expense' || !input.categoryId) return

  let budgetQuery = supabase
    .from('budgets')
    .select('amount_cents, categories(name)')
    .eq('category_id', input.categoryId)
  budgetQuery = input.orgId
    ? budgetQuery.eq('scope', 'org').eq('org_id', input.orgId)
    : budgetQuery.eq('scope', 'user').eq('user_id', input.userId).is('org_id', null)

  const { data: budget, error: budgetError } = await budgetQuery.maybeSingle()
  if (budgetError) throw new Error(`Failed to check budget: ${budgetError.message}`)
  if (!budget || budget.amount_cents <= 0) return

  const baseCurrency = await resolveBaseCurrency(supabase, input.userId, input.orgId)
  const rates = await fetchBaseRates(supabase, baseCurrency)

  const { from, to } = monthWindow(input.date)
  let spentQuery = supabase
    .from('expenses')
    .select('amount_cents, currency')
    .eq('category_id', input.categoryId)
    .eq('entry_type', 'expense')
    .eq('is_deleted', false)
    .gte('date', from)
    .lt('date', to)
  spentQuery = input.orgId
    ? spentQuery.eq('org_id', input.orgId)
    : spentQuery.eq('user_id', input.userId).is('org_id', null)
  if (input.excludeExpenseId) spentQuery = spentQuery.neq('id', input.excludeExpenseId)

  const { data: monthExpenses, error: spentError } = await spentQuery
  if (spentError) throw new Error(`Failed to check budget: ${spentError.message}`)

  const spentCents = sumInBaseCurrency(monthExpenses || [], baseCurrency, rates)

  // New amount in base currency. Without a live rate, fall back to the stored
  // converted value; if neither exists we cannot price it and fail open.
  let newBaseCents: number | null = null
  if (input.currency === baseCurrency) {
    newBaseCents = input.amountCents
  } else if (typeof rates[input.currency] === 'number' && rates[input.currency] > 0) {
    newBaseCents = Math.round(input.amountCents / rates[input.currency])
  } else if (input.convertedCurrency === baseCurrency && input.convertedAmountCents != null) {
    newBaseCents = input.convertedAmountCents
  }
  if (newBaseCents === null) return

  if (wouldExceedBudget(budget.amount_cents, spentCents, newBaseCents)) {
    const categoryName = (budget.categories as unknown as { name?: string } | null)?.name ?? 'this category'
    throw new BudgetExceededError(
      input.categoryId,
      budget.amount_cents,
      spentCents,
      newBaseCents,
      baseCurrency,
      categoryName
    )
  }
}
