import { createClient } from '@/shared/lib/supabase/server'
import { getActiveOrgId } from '@/shared/lib/org-context'
import type { Budget } from './schema'

export type BudgetScope = 'user' | 'org'

export interface UpsertBudgetInput {
  /** 'user' = personal budget, 'org' = org-wide category budget. */
  scope: BudgetScope
  category_id: string
  amount_cents: number
}

/**
 * Saves a budget for the current user's active org, creating or updating
 * the row for (scope, org, user, category).
 *
 * SECURITY: `user_id` is always derived from the authenticated session and
 * `org_id` from the validated active-org context — never from caller input.
 * RLS policies on the budgets table enforce the same rules at the database layer.
 */
export async function upsertBudget(input: UpsertBudgetInput): Promise<Budget | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const orgId = await getActiveOrgId()
  if (input.scope === 'org' && !orgId) {
    throw new Error('An active organization is required for org budgets')
  }

  // Manual upsert: the dedupe unique index uses an expression
  // (COALESCE(org_id, sentinel)) so Postgres `ON CONFLICT (columns)` inference
  // cannot match it. We instead locate an existing row with IS NOT DISTINCT FROM
  // semantics (eq for present org_id, is('org_id', null) for solo) and update it,
  // falling back to an insert when none exists.
  let existingQuery = supabase
    .from('budgets')
    .select('id')
    .eq('scope', input.scope)
    .eq('user_id', user.id)
    .eq('category_id', input.category_id)

  existingQuery = orgId
    ? existingQuery.eq('org_id', orgId)
    : existingQuery.is('org_id', null)

  const { data: existing, error: findError } = await existingQuery.maybeSingle()
  if (findError) throw new Error(`Failed to look up budget: ${findError.message}`)

  const payload = {
    scope: input.scope,
    org_id: orgId,
    user_id: user.id,
    category_id: input.category_id,
    amount_cents: input.amount_cents,
  }

  const query = existing
    ? supabase
        .from('budgets')
        .update({ amount_cents: input.amount_cents })
        .eq('id', existing.id)
        .select()
        .single()
    : supabase.from('budgets').insert(payload).select().single()

  const { data, error } = await query
  if (error) throw new Error(`Failed to save budget: ${error.message}`)
  return data
}

/**
 * Deletes a budget by ID. RLS enforces that users can only delete their own
 * personal budgets, while managers/org-admins can also delete org budgets.
 */
export async function deleteBudget(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete budget: ${error.message}`)
}
