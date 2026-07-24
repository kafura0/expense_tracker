'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

async function verifySuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase: null, user: null, error: 'Not authenticated' as const }

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .single()

  if (!membership) return { supabase: null, user: null, error: 'Not authorized' as const }
  return { supabase, user, error: null }
}

export async function getAdminClients() {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const { data, error: queryError } = await supabase
    .from('organizations')
    .select(
      `id, name, slug, status, created_at,
       subscriptions(plan(name, price_monthly)),
       org_members(user_id, profiles(display_name, email))`
    )
    .order('created_at', { ascending: false })

  if (queryError) return { error: queryError.message }
  return { clients: data }
}

export async function getAdminAuditLogs(params?: {
  action?: string
  org_id?: string
  limit?: number
  offset?: number
}) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  let query = supabase
    .from('audit_logs')
    .select(
      `id, action, entity_type, entity_id, old_value, new_value,
       ip_address, created_at, user_id, org_id,
       profiles(display_name, email)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 49))

  if (params?.action) query = query.eq('action', params.action)
  if (params?.org_id) query = query.eq('org_id', params.org_id)

  const { data, error: queryError, count } = await query
  if (queryError) return { error: queryError.message }
  return { logs: data, total: count || 0 }
}

export async function getAdminMessages(params?: {
  type?: string
  status?: string
  limit?: number
  offset?: number
}) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  let query = supabase
    .from('messages')
    .select(
      `id, subject, body, type, status, priority, admin_reply,
       replied_at, created_at, user_id, org_id,
       profiles(display_name, email),
       organizations(name)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 49))

  if (params?.type) query = query.eq('type', params.type)
  if (params?.status) query = query.eq('status', params.status)

  const { data, error: queryError, count } = await query
  if (queryError) return { error: queryError.message }
  return { messages: data, total: count || 0 }
}

export async function replyToMessage(messageId: string, reply: string) {
  const { supabase, user, error } = await verifySuperAdmin()
  if (error) return { error }

  const { error: updateError } = await supabase
    .from('messages')
    .update({
      admin_reply: reply,
      replied_by: user!.id,
      replied_at: new Date().toISOString(),
      status: 'replied',
    })
    .eq('id', messageId)

  if (updateError) return { error: updateError.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function closeMessage(messageId: string) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const { error: updateError } = await supabase
    .from('messages')
    .update({ status: 'closed' })
    .eq('id', messageId)

  if (updateError) return { error: updateError.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function getAdminPlans() {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const { data, error: queryError } = await supabase
    .from('plans')
    .select('*')
    .order('price_monthly', { ascending: true })

  if (queryError) return { error: queryError.message }
  return { plans: data }
}

export async function updatePlan(
  planId: string,
  updates: { name?: string; price_monthly?: number; features?: string[] }
) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const { error: updateError } = await supabase
    .from('plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', planId)

  if (updateError) return { error: updateError.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function toggleOrgStatus(
  orgId: string,
  newStatus: 'active' | 'suspended'
) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const { error: updateError } = await supabase
    .from('organizations')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orgId)

  if (updateError) return { error: updateError.message }
  revalidatePath('/admin')
  return { success: true }
}
