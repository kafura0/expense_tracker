'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
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

/**
 * Service-role client used ONLY in these server actions to read `auth.users`
 * emails (the `profiles` table has no email column and PostgREST cannot embed
 * `profiles` from `org_members`/`messages` — there is no FK between them).
 * Never exposed to the client; guarded by `verifySuperAdmin()`.
 */
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseJsClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function emailLookup(): Promise<Map<string, string>> {
  const service = createServiceClient()
  if (!service) return new Map()
  const { data } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  return new Map((data?.users || []).map((u) => [u.id, u.email || '']))
}

function sanitizeText(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ANNOUNCEMENT_CATEGORIES = ['announcement', 'offer', 'maintenance'] as const
const ANNOUNCEMENT_AUDIENCES = ['everyone', 'orgs', 'solo', 'org'] as const

export async function getAdminClients() {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const [
    { data: orgs, error: orgError },
    { data: memberships, error: memError },
    { data: profiles, error: profError },
    { data: subscriptions, error: subError },
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, slug, status, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('org_members').select('user_id, org_id, role'),
    supabase.from('profiles').select('user_id, display_name, is_suspended, created_at'),
    supabase.from('subscriptions').select('org_id, plan(name, price_monthly)'),
  ])

  if (orgError || memError || profError || subError) {
    return { error: orgError?.message || memError?.message || profError?.message || subError?.message }
  }

  const emailByUserId = await emailLookup()
  const displayByUserId = new Map((profiles || []).map((p) => [p.user_id, p.display_name]))

  const clients = (orgs || []).map((org) => {
    const members = (memberships || [])
      .filter((m) => m.org_id === org.id)
      .map((m) => ({
        user_id: m.user_id,
        role: m.role,
        display_name:
          displayByUserId.get(m.user_id) || emailByUserId.get(m.user_id)?.split('@')[0] || 'Unknown',
        email: emailByUserId.get(m.user_id) || '',
      }))
    const sub = (subscriptions || []).find((s) => s.org_id === org.id)
    const plan = (sub as { plan?: { name?: string; price_monthly?: number } } | undefined)?.plan
    return {
      ...org,
      members,
      plan: plan?.name || null,
      plan_price: plan?.price_monthly ?? null,
    }
  })

  const orgMemberUserIds = new Set((memberships || []).map((m) => m.user_id))
  const soloAccounts = (profiles || [])
    .filter((p) => !orgMemberUserIds.has(p.user_id))
    .map((p) => ({
      user_id: p.user_id,
      display_name:
        displayByUserId.get(p.user_id) || emailByUserId.get(p.user_id)?.split('@')[0] || 'Unknown',
      email: emailByUserId.get(p.user_id) || '',
      is_suspended: Boolean(p.is_suspended),
      created_at: p.created_at,
    }))

  return { clients, soloAccounts }
}

export async function getAdminUsers(params?: {
  kind?: 'solo' | 'org' | 'super_admin' | ''
  suspended?: 'all' | 'suspended' | 'active'
  search?: string
}) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const [
    profilesResult,
    membersResult,
    orgsResult,
  ] = await Promise.all([
    supabase.from('profiles').select('user_id, display_name, is_suspended, created_at'),
    supabase.from('org_members').select('user_id, org_id, role'),
    supabase.from('organizations').select('id, name, slug, status'),
  ])

  if (profilesResult.error) return { error: profilesResult.error.message }
  if (membersResult.error) return { error: membersResult.error.message }
  if (orgsResult.error) return { error: orgsResult.error.message }

  const emailByUserId = await emailLookup()
  const profiles = profilesResult.data || []
  const memberships = membersResult.data || []
  const orgs = orgsResult.data || []

  const orgById = new Map(orgs.map((o) => [o.id, o]))
  const membersByUser = new Map<string, { org_id: string; role: string }[]>()
  for (const m of memberships) {
    const list = membersByUser.get(m.user_id) || []
    list.push({ org_id: m.org_id, role: m.role })
    membersByUser.set(m.user_id, list)
  }
  const profileByUser = new Map(profiles.map((p) => [p.user_id, p]))

  let users = Array.from(emailByUserId.entries()).map(([userId, email]) => {
    const profile = profileByUser.get(userId)
    const orgMembers = membersByUser.get(userId) || []
    const isSuperAdmin = orgMembers.some((m) => m.role === 'super_admin')
    const kind: 'solo' | 'org' | 'super_admin' = isSuperAdmin
      ? 'super_admin'
      : orgMembers.length > 0
        ? 'org'
        : 'solo'
    return {
      userId,
      email,
      displayName: profile?.display_name || email?.split('@')[0] || 'Unnamed user',
      createdAt: profile?.created_at || null,
      isSuspended: Boolean(profile?.is_suspended),
      kind,
      primaryRole: isSuperAdmin
        ? 'super_admin'
        : orgMembers[0]?.role || 'solo',
      orgs: orgMembers.map((m) => {
        const org = orgById.get(m.org_id)
        return {
          orgId: m.org_id,
          name: org?.name || 'Unknown',
          slug: org?.slug || '',
          status: org?.status || 'unknown',
          role: m.role,
        }
      }),
    }
  })

  const activeOrgs = orgs.filter((o) => o.status === 'active').length
  const suspendedUsers = users.filter((u) => u.isSuspended).length

  if (params?.kind) users = users.filter((u) => u.kind === params.kind)
  if (params?.suspended === 'suspended') users = users.filter((u) => u.isSuspended)
  if (params?.suspended === 'active') users = users.filter((u) => !u.isSuspended)
  if (params?.search) {
    const q = params.search.toLowerCase()
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.orgs.some((o) => o.name.toLowerCase().includes(q))
    )
  }

  return { users, activeOrgs, suspendedUsers }
}

export async function setUserStatus(userId: string, isSuspended: boolean) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .maybeSingle()

  if (membership && isSuspended) {
    return { error: 'Super admins cannot be suspended' }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_suspended: isSuspended, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (updateError) return { error: updateError.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function createAnnouncementAction(input: {
  title: string
  body: string
  category: (typeof ANNOUNCEMENT_CATEGORIES)[number]
  audience: (typeof ANNOUNCEMENT_AUDIENCES)[number]
  targetOrgId?: string | null
}) {
  const { supabase, user, error } = await verifySuperAdmin()
  if (error) return { error }

  const title = input.title.trim().slice(0, 100)
  const body = input.body.trim().slice(0, 4000)
  if (!title || !body) return { error: 'Title and body are required' }

  if (!ANNOUNCEMENT_CATEGORIES.includes(input.category)) return { error: 'Invalid announcement type' }
  if (!ANNOUNCEMENT_AUDIENCES.includes(input.audience)) return { error: 'Invalid audience' }
  if (input.audience === 'org' && !input.targetOrgId) return { error: 'Select an organization for this audience' }

  const { error: insertError } = await supabase.from('messages').insert({
    user_id: user!.id,
    org_id: null,
    type: 'announcement',
    status: 'open',
    priority: 'normal',
    subject: sanitizeText(title),
    body: sanitizeText(body),
    category: input.category,
    audience: input.audience,
    target_org_id: input.audience === 'org' ? input.targetOrgId : null,
  })

  if (insertError) return { error: insertError.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteAnnouncement(messageId: string) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const { error: deleteError } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('type', 'announcement')

  if (deleteError) return { error: deleteError.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function getAdminOrganizations() {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const { data, error: queryError } = await supabase
    .from('organizations')
    .select('id, name, slug, status')
    .order('name', { ascending: true })

  if (queryError) return { error: queryError.message }
  return { orgs: data }
}

export async function getAdminKpis() {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [{ count: userCount }, { count: orgCount }, { count: expenseCount }, { data: monthExpenses }, { data: openTickets }] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase
        .from('expenses')
        .select('amount_cents')
        .eq('is_deleted', false)
        .gte('date', monthStart.toISOString()),
      supabase
        .from('messages')
        .select('id')
        .eq('type', 'support')
        .eq('status', 'open'),
    ])

  const monthSpend =
    (monthExpenses || []).reduce((sum: number, e: { amount_cents: number }) => sum + e.amount_cents, 0) || 0

  return {
    kpis: {
      users: userCount || 0,
      organizations: orgCount || 0,
      expenses: expenseCount || 0,
      month_spend: monthSpend,
      open_tickets: (openTickets || []).length,
    },
  }
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
       ip_address, created_at, user_id, org_id`,
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
      `id, subject, body, type, status, priority, category, audience,
       target_org_id, admin_reply, replied_at, created_at, user_id, org_id`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 49))

  if (params?.type) query = query.eq('type', params.type)
  if (params?.status) query = query.eq('status', params.status)

  const { data, error: queryError, count } = await query
  if (queryError) return { error: queryError.message }

  const messages = data || []
  const userIds = Array.from(new Set(messages.map((m) => m.user_id).filter(Boolean)))
  const orgIds = Array.from(
    new Set(messages.map((m) => m.org_id || m.target_org_id).filter(Boolean))
  )

  const [sendersResult, orgsResult] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('user_id, display_name').in('user_id', userIds)
      : Promise.resolve({ data: [] }),
    orgIds.length
      ? supabase.from('organizations').select('id, name').in('id', orgIds)
      : Promise.resolve({ data: [] }),
  ])

  const emailByUserId = new Map<string, string>()
  if (userIds.length) {
    for (const [id, email] of await emailLookup()) {
      if (userIds.includes(id)) emailByUserId.set(id, email)
    }
  }

  const displayByUserId = new Map((sendersResult.data || []).map((p) => [p.user_id, p.display_name]))
  const orgNameById = new Map((orgsResult.data || []).map((o) => [o.id, o.name]))

  return {
    messages: messages.map((m) => ({
      ...m,
      sender_name: displayByUserId.get(m.user_id) || emailByUserId.get(m.user_id)?.split('@')[0] || 'Unknown',
      sender_email: emailByUserId.get(m.user_id) || '',
      org_name: m.org_id
        ? orgNameById.get(m.org_id)
        : m.target_org_id
          ? orgNameById.get(m.target_org_id)
          : null,
    })),
    total: count || 0,
  }
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
