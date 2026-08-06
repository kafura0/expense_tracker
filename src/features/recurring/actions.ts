'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { getActiveOrgId } from '@/shared/lib/org-context'
import {
  recurringExpenseInsertSchema,
  recurringExpenseUpdateSchema,
  type RecurringExpenseInsert,
  type RecurringExpenseUpdate,
} from '@/entities/recurring/schema'
import type { RecurringWithCategory } from '@/entities/recurring/types'
import { buildMissedSchedule } from '@/entities/recurring/dates'
import { logAuditEvent } from '@/shared/lib/audit-logger'

export async function listRecurring(): Promise<{ data: RecurringWithCategory[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const orgId = await getActiveOrgId()

    let query = supabase
      .from('recurring_expenses')
      .select('*, categories(id, name, icon, color)')
      .order('created_at', { ascending: false })

    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.eq('user_id', user.id).is('org_id', null)
    }

    const { data, error } = await query
    if (error) return { data: null, error: error.message }

    return { data: (data as RecurringWithCategory[]) || [], error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to load recurring expenses' }
  }
}

export async function createRecurring(input: RecurringExpenseInsert) {
  const parsed = recurringExpenseInsertSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: 'Invalid recurring expense data' }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const orgId = await getActiveOrgId()

    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert({
        ...parsed.data,
        next_due_date: parsed.data.next_due_date ?? parsed.data.start_date,
        user_id: user.id,
        org_id: orgId,
      })
      .select('*, categories(id, name, icon, color)')
      .single()

    if (error) return { data: null, error: error.message }

    await logAuditEvent({
      action: 'recurring.create',
      org_id: orgId,
      entity_type: 'recurring_expense',
      entity_id: data.id,
      new_value: {
        description: data.description,
        frequency: data.frequency,
        amount_cents: data.amount_cents,
      },
    })

    revalidatePath('/expenses')
    return { data: data as RecurringWithCategory, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create recurring expense' }
  }
}

export async function updateRecurring(id: string, patch: RecurringExpenseUpdate) {
  const parsed = recurringExpenseUpdateSchema.safeParse(patch)
  if (!parsed.success) return { data: null, error: 'Invalid recurring expense data' }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(parsed.data)
      .eq('id', id)
      .select('*, categories(id, name, icon, color)')
      .maybeSingle()

    if (error) return { data: null, error: error.message }
    if (!data) return { data: null, error: 'Recurring expense not found' }

    await logAuditEvent({
      action: 'recurring.update',
      org_id: data.org_id,
      entity_type: 'recurring_expense',
      entity_id: data.id,
      new_value: { is_active: data.is_active, next_due_date: data.next_due_date },
    })

    revalidatePath('/expenses')
    return { data: data as RecurringWithCategory, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update recurring expense' }
  }
}

export async function deleteRecurring(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: existing, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('org_id')
      .eq('id', id)
      .maybeSingle()
    if (fetchError) return { error: fetchError.message }
    if (!existing) return { error: 'Recurring expense not found' }

    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
    if (error) return { error: error.message }

    await logAuditEvent({
      action: 'recurring.delete',
      org_id: existing.org_id,
      entity_type: 'recurring_expense',
      entity_id: id,
    })

    revalidatePath('/expenses')
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete recurring expense' }
  }
}

/**
 * Materialize due recurring templates into `expenses`.
 *
 * Called by the expenses page on load. Each due template advances by a
 * conditional UPDATE anchored on its current `next_due_date`, so when two
 * sessions load concurrently only the first wins the race and inserts the
 * expense rows; the loser's UPDATE matches zero rows and is skipped.
 *
 * Fully catch-up: a monthly template behind three periods inserts three
 * expenses (one per missed due date) before settling on the next future date.
 */
export async function materializeDueRecurring(): Promise<{ data: { created: number } | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: { created: 0 }, error: null }

    const today = new Date()
    const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      .toISOString()
      .slice(0, 10)

    // Scope to the active org when the user belongs to one; solo users are
    // already confined to their own personal templates by RLS.
    const orgId = await getActiveOrgId()

    let query = supabase
      .from('recurring_expenses')
      .select('*')
      .eq('is_active', true)
      .lte('next_due_date', todayStr)
    if (orgId) query = query.eq('org_id', orgId)

    const { data: due, error } = await query

    if (error) return { data: { created: 0 }, error: error.message }

    let created = 0
    for (const template of due) {
      const oldDue = new Date(`${template.next_due_date}T00:00:00`)
      const { missed, next } = buildMissedSchedule(oldDue, template.frequency, today)
      if (missed.length === 0) continue

      // Atomic claim: only the first caller sees the update match.
      const { error: advanceError } = await supabase
        .from('recurring_expenses')
        .update({
          next_due_date: next.toISOString().slice(0, 10),
          last_generated_at: new Date().toISOString(),
        })
        .eq('id', template.id)
        .eq('next_due_date', template.next_due_date)
        .eq('is_active', true)

      if (advanceError) continue

      for (const dueDate of missed) {
        const date = new Date(
          Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 12)
        ).toISOString()

        const { error: insertError } = await supabase.from('expenses').insert({
          user_id: template.user_id,
          org_id: template.org_id,
          entry_type: template.entry_type,
          amount_cents: template.amount_cents,
          currency: template.currency,
          category_id: template.category_id,
          title: template.description,
          notes: `Recurring · ${template.description}`,
          date,
        })

        if (insertError) continue
        created++
      }
    }

    if (created > 0) revalidatePath('/expenses')
    return { data: { created }, error: null }
  } catch (error) {
    return { data: { created: 0 }, error: error instanceof Error ? error.message : 'Failed to process recurring expenses' }
  }
}
