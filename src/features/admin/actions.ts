'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import { logAuditEvent } from '@/shared/lib/audit-logger'
import { provisionApprovedRequest } from '@/shared/lib/provisioning'

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
  const map = new Map<string, string>()
  const perPage = 1000
  let page = 1
  // auth.admin.listUsers paginates; keep paging until a short page is returned
  // so the admin roster is not silently truncated at the first 1000 users.
  for (;;) {
    const { data } = await service.auth.admin.listUsers({ page, perPage })
    const users = data?.users || []
    for (const u of users) map.set(u.id, u.email || '')
    if (users.length < perPage) break
    page += 1
  }
  return map
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
    supabase.from('subscriptions').select('id, org_id, status, plan_id, plan(name, price_monthly_cents)'),
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
    const plan = (sub as { plan?: { name?: string; price_monthly_cents?: number } } | undefined)?.plan
    return {
      ...org,
      subscription_id: (sub as { id?: string } | undefined)?.id ?? null,
      plan_id: (sub as { plan_id?: string } | undefined)?.plan_id ?? null,
      subscription_status: (sub as { status?: string } | undefined)?.status ?? null,
      members,
      plan: plan?.name || null,
      plan_price:
        plan?.price_monthly_cents != null ? Number(plan.price_monthly_cents) / 100 : null,
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
  user_id?: string
  org_id?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const limit = params?.limit || 50
  const offset = params?.offset || 0

  let query = supabase
    .from('audit_logs')
    .select(
      `id, action, entity_type, entity_id, old_value, new_value,
       ip_address, created_at, user_id, org_id`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (params?.action) query = query.eq('action', params.action)
  if (params?.org_id) query = query.eq('org_id', params.org_id)
  if (params?.user_id) query = query.eq('user_id', params.user_id)
  if (params?.from) query = query.gte('created_at', new Date(params.from).toISOString())
  if (params?.to) query = query.lte('created_at', new Date(params.to).toISOString())

  const { data, error: queryError, count } = await query
  if (queryError) return { error: queryError.message }

  // Resolve actor emails for the returned rows (service-role only).
  const userIds = Array.from(new Set((data || []).map((l) => l.user_id).filter(Boolean)))
  const emailMap = userIds.length ? await emailLookup() : new Map<string, string>()
  const actorByUser = new Map<string, string>()
  for (const id of userIds) {
    if (emailMap.has(id)) actorByUser.set(id, emailMap.get(id) as string)
  }

  return {
    logs: (data || []).map((l) => ({
      ...l,
      actor_email: l.user_id ? (actorByUser.get(l.user_id) ?? null) : null,
    })),
    total: count || 0,
  }
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
    .order('price_monthly_cents', { ascending: true })

  if (queryError) return { error: queryError.message }
  return { plans: data }
}

export async function updatePlan(
  planId: string,
  updates: {
    name?: string
    price_monthly_cents?: number
    price_yearly_cents?: number
    max_members?: number
    features?: string[]
  }
) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  // FR-25: prices are non-negative whole cents; reject negative/non-numeric input.
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue
    if (key === 'name') {
      const name = String(value).trim().slice(0, 100)
      if (!name) return { error: 'Plan name cannot be empty' }
      patch.name = name
      continue
    }
    if (key === 'price_monthly_cents' || key === 'price_yearly_cents' || key === 'max_members') {
      const n = Number(value)
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        return { error: 'Prices and member limits must be non-negative whole numbers' }
      }
      patch[key] = n
      continue
    }
    patch[key] = value
  }

  if (Object.keys(patch).length === 0) return { error: 'No changes to save' }

  const { data: before } = await supabase
    .from('plans')
    .select('name, slug, price_monthly_cents, price_yearly_cents, max_members, features')
    .eq('id', planId)
    .maybeSingle()
  if (!before) return { error: 'Plan not found' }

  const { error: updateError } = await supabase
    .from('plans')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', planId)

  if (updateError) return { error: updateError.message }

  await logAuditEvent({
    action: 'plan.price_update',
    org_id: null,
    entity_type: 'plan',
    entity_id: planId,
    old_value: {
      name: before.name,
      price_monthly_cents: Number(before.price_monthly_cents),
      price_yearly_cents: Number(before.price_yearly_cents),
      max_members: Number(before.max_members),
    },
    new_value: patch,
  })

  revalidatePath('/admin')
  return { success: true }
}

export async function createPlan(input: {
  name: string
  slug: string
  price_monthly_cents: number
  price_yearly_cents: number
  max_members: number
  max_expenses_per_month: number
}) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const name = input.name.trim().slice(0, 100)
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  if (!name || !slug) return { error: 'Name and slug are required' }
  for (const key of ['price_monthly_cents', 'price_yearly_cents', 'max_members', 'max_expenses_per_month'] as const) {
    const n = Number(input[key])
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      return { error: 'Prices and limits must be non-negative whole numbers' }
    }
  }

  const { data: plan, error: insertError } = await supabase
    .from('plans')
    .insert({
      name,
      slug,
      price_monthly_cents: Number(input.price_monthly_cents),
      price_yearly_cents: Number(input.price_yearly_cents),
      max_members: Number(input.max_members),
      max_expenses_per_month: Number(input.max_expenses_per_month),
      features: {},
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }

  await logAuditEvent({
    action: 'plan.price_update',
    org_id: null,
    entity_type: 'plan',
    entity_id: plan.id,
    new_value: { name, slug, price_monthly_cents: Number(input.price_monthly_cents) },
  })

  revalidatePath('/admin')
  return { success: true }
}

export async function setOrgPlan(input: {
  orgId: string
  planId: string
  status?: 'active' | 'trialing' | 'cancelled' | 'expired' | 'past_due'
}) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name')
    .eq('id', input.planId)
    .maybeSingle()
  if (!plan) return { error: 'Plan not found' }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, status')
    .eq('id', input.orgId)
    .maybeSingle()
  if (!org) return { error: 'Organization not found' }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, plan_id, status')
    .eq('org_id', input.orgId)
    .maybeSingle()

  const now = new Date().toISOString()
  if (subscription) {
    const patch: Record<string, unknown> = { plan_id: input.planId, updated_at: now }
    if (input.status && input.status !== subscription.status) patch.status = input.status
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(patch)
      .eq('id', subscription.id)
    if (updateError) return { error: updateError.message }

    await logAuditEvent({
      action: 'subscription.plan_change',
      org_id: input.orgId,
      entity_type: 'subscription',
      entity_id: subscription.id,
      old_value: { plan_id: subscription.plan_id, status: subscription.status },
      new_value: { plan_id: input.planId, status: input.status ?? subscription.status },
    })
  } else {
    const status = input.status ?? (org.status === 'active' ? 'active' : 'trialing')
    const { data: created, error: insertError } = await supabase
      .from('subscriptions')
      .insert({ org_id: input.orgId, plan_id: input.planId, status })
      .select('id')
      .single()
    if (insertError) return { error: insertError.message }

    await logAuditEvent({
      action: 'subscription.plan_change',
      org_id: input.orgId,
      entity_type: 'subscription',
      entity_id: created.id,
      new_value: { plan_id: input.planId, status },
    })
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function getClientRequests(params?: { status?: 'pending' | 'approved' | 'rejected' }) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  let query = supabase
    .from('client_requests')
    .select('id, name, email, business_name, phone, message, status, created_at, reviewed_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (params?.status) query = query.eq('status', params.status)

  const { data, error: queryError } = await query
  if (queryError) return { error: queryError.message }

  const { count: pendingCount } = await supabase
    .from('client_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return { requests: data, pendingCount: pendingCount || 0 }
}

export async function approveRequestAction(input: {
  requestId: string
  planSlug: string
  assignOrgAdmin: boolean
}) {
  const { supabase, error } = await verifySuperAdmin()
  if (error) return { error }

  if (!input.planSlug) return { error: 'Select a plan' }

  const { data: request } = await supabase
    .from('client_requests')
    .select('id, email, name, business_name, status')
    .eq('id', input.requestId)
    .maybeSingle()
  if (!request) return { error: 'Request not found' }
  if (request.status !== 'pending') return { error: 'Request already reviewed' }

  try {
    await provisionApprovedRequest({
      requestId: input.requestId,
      email: request.email,
      name: request.name,
      businessName: request.business_name,
      planSlug: input.planSlug,
      assignOrgAdmin: input.assignOrgAdmin,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Approval failed' }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function rejectRequestAction(requestId: string) {
  const { supabase, user, error } = await verifySuperAdmin()
  if (error) return { error }

  const { data: request } = await supabase
    .from('client_requests')
    .select('id, email, name, status')
    .eq('id', requestId)
    .maybeSingle()
  if (!request) return { error: 'Request not found' }
  if (request.status !== 'pending') return { error: 'Request already reviewed' }

  const { error: updateError } = await supabase
    .from('client_requests')
    .update({
      status: 'rejected',
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (updateError) return { error: updateError.message }

  await logAuditEvent({
    action: 'request.reject',
    org_id: null,
    entity_type: 'client_request',
    entity_id: requestId,
    old_value: { status: 'pending' },
    new_value: { status: 'rejected' },
  })

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
