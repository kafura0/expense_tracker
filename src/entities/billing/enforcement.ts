import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Pure decision: does creating `additional` more expenses this month push the
 * org past its plan's `max_expenses_per_month`?
 *
 * A negative limit means unlimited; a zero limit blocks every expense.
 */
export function wouldExceedMonthlyCap(limit: number, usedThisMonth: number, additional = 1): boolean {
  if (limit < 0) return false
  if (limit === 0) return true
  return usedThisMonth + additional > limit
}

/** Pure message builder, exported for unit testing. */
export function buildCapMessage(limit: number, usedThisMonth: number): string {
  return (
    `This workspace has reached its ${limit} monthly expense limit ` +
    `(${usedThisMonth} created this month). Upgrade to the Pro plan for unlimited expenses.`
  )
}

export class ExpenseCapExceededError extends Error {
  readonly limit: number
  readonly usedThisMonth: number

  constructor(limit: number, usedThisMonth: number) {
    super(buildCapMessage(limit, usedThisMonth))
    this.name = 'ExpenseCapExceededError'
    this.limit = limit
    this.usedThisMonth = usedThisMonth
  }
}

function monthWindow(now: Date): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString() }
}

export interface MonthlyCapEnforcementInput {
  orgId: string | null
  /** Defaults to now; injectable for deterministic tests. */
  now?: Date
}

/**
 * Server-side plan limit guard for expense writes.
 *
 * Counts this month's non-deleted expense entries for the org and throws an
 * `ExpenseCapExceededError` when the plan's `max_expenses_per_month` would be
 * exceeded. Solo users (no org) and orgs without a subscription row are not
 * capped. Income entries never count against the limit.
 *
 * The check runs at the application layer, same as the budget guard. RLS
 * remains the authoritative data boundary; the count → write window is narrow
 * but not transactional.
 */
export async function assertMonthlyExpenseCap(
  supabase: SupabaseClient,
  input: MonthlyCapEnforcementInput
): Promise<void> {
  if (!input.orgId) return

  const now = input.now ?? new Date()
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('plan(max_expenses_per_month)')
    .eq('org_id', input.orgId)
    .maybeSingle()
  if (subError) throw new Error(`Failed to check plan limits: ${subError.message}`)
  const plan = subscription?.plan as unknown as { max_expenses_per_month: number } | null
  if (!plan) return

  const limit = plan.max_expenses_per_month
  if (limit < 0) return

  const { from, to } = monthWindow(now)
  const { count, error: countError } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', input.orgId)
    .eq('entry_type', 'expense')
    .eq('is_deleted', false)
    .gte('date', from)
    .lt('date', to)

  if (countError) throw new Error(`Failed to check plan limits: ${countError.message}`)

  const usedThisMonth = count ?? 0
  if (wouldExceedMonthlyCap(limit, usedThisMonth)) {
    throw new ExpenseCapExceededError(limit, usedThisMonth)
  }
}
