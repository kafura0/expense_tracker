'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/server'
import { clientRequestSchema } from '@/entities/org/schema'

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: 'Invalid email or password' }
  }

  return { success: true }
}

export async function requestAccess(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const businessName = formData.get('business_name') as string
  const phone = formData.get('phone') as string
  const message = formData.get('message') as string

  const parsed = clientRequestSchema.safeParse({
    name,
    email,
    business_name: businessName || undefined,
    phone: phone || undefined,
    message: message || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()

  // Check if request already exists for this email
  const { data: existing } = await supabase
    .from('client_requests')
    .select('id, status')
    .eq('email', email)
    .single()

  if (existing) {
    if (existing.status === 'approved') {
      return { error: 'A request for this email has already been approved. Please check your email to create your account.' }
    }
    if (existing.status === 'pending') {
      return { error: 'A request for this email is already pending review.' }
    }
    if (existing.status === 'rejected') {
      return { error: 'A previous request for this email was declined. Please contact support.' }
    }
  }

  const { error } = await supabase
    .from('client_requests')
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      business_name: parsed.data.business_name,
      phone: parsed.data.phone,
      message: parsed.data.message,
    })

  if (error) {
    return { error: 'Failed to submit request. Please try again.' }
  }

  return { success: 'Your request has been submitted. You will receive an email once approved.' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email for password reset link' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const data = {
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.updateUser(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

/**
 * Super admin: approve a client request.
 * Creates the user, org, and assigns the money manager.
 */
export async function approveClientRequest(
  requestId: string,
  managerId: string,
  planSlug: string = 'free'
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify super admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .single()

  if (!membership) {
    return { error: 'Not authorized' }
  }

  // Get the request
  const { data: request, error: reqError } = await supabase
    .from('client_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (reqError || !request) {
    return { error: 'Request not found' }
  }

  if (request.status !== 'pending') {
    return { error: 'Request already reviewed' }
  }

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === request.email)

  let targetUserId = existingUser?.id

  if (!existingUser) {
    // Create the user with a temporary password (they'll reset it)
    const tempPassword = crypto.randomUUID().slice(0, 16) + 'A1!'
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: request.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: request.name,
      },
    })

    if (createError) {
      return { error: `Failed to create user: ${createError.message}` }
    }
    targetUserId = newUser.user.id

    // Send password reset email so they can set their own password
    await supabase.auth.admin.inviteUserByEmail(request.email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/update-password`,
    })
  }

  if (!targetUserId) {
    return { error: 'Failed to create or find user' }
  }

  // Create org using the SQL function
  const orgName = request.business_name || request.name
  const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const { data: orgId, error: orgError } = await supabase.rpc('create_org_for_user', {
    p_org_name: orgName,
    p_org_slug: orgSlug,
    p_user_id: targetUserId,
    p_plan_slug: planSlug,
  })

  if (orgError) {
    return { error: `Failed to create organization: ${orgError.message}` }
  }

  // Assign money manager
  if (managerId) {
    await supabase
      .from('org_members')
      .upsert({
        org_id: orgId as string,
        user_id: managerId,
        role: 'manager',
      }, { onConflict: 'org_id,user_id' })
  }

  // Update request status
  await supabase
    .from('client_requests')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  revalidatePath('/admin')

  return { success: true, orgId: orgId as string }
}

/**
 * Super admin: reject a client request.
 */
export async function rejectClientRequest(requestId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify super admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .single()

  if (!membership) {
    return { error: 'Not authorized' }
  }

  const { error } = await supabase
    .from('client_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Super admin: suspend or activate an organization.
 *
 * When an org is suspended:
 * - Its members can no longer access data (RLS checks org status)
 * - The org remains in the database for audit purposes
 *
 * SECURITY: Only super admins can change org status.
 * The server-side check ensures client-side UI cannot bypass this.
 */
export async function toggleOrgStatus(orgId: string, newStatus: 'active' | 'suspended' | 'cancelled') {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify super admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .single()

  if (!membership) {
    return { error: 'Not authorized' }
  }

  const { error } = await supabase
    .from('organizations')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orgId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Super admin: fetch admin dashboard data.
 *
 * Returns all orgs, client requests, and managers in a single call.
 * This avoids the client making multiple separate queries and ensures
 * all data is fetched with the same server-side auth context.
 */
export async function getAdminDashboardData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify super admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .single()

  if (!membership) {
    return { error: 'Not authorized' }
  }

  // Fetch all data in parallel
  const [requestsResult, orgsResult, managersResult, plansResult] = await Promise.all([
    supabase
      .from('client_requests')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('organizations')
      .select('*, subscriptions(plan(name)), org_members(user_id)')
      .order('created_at', { ascending: false }),
    supabase
      .from('org_members')
      .select('id, user_id, org_id, role, profiles(display_name, avatar_url)')
      .eq('role', 'manager'),
    supabase
      .from('plans')
      .select('*'),
  ])

  if (requestsResult.error) return { error: requestsResult.error.message }
  if (orgsResult.error) return { error: orgsResult.error.message }

  return {
    requests: requestsResult.data || [],
    orgs: (orgsResult.data || []).map((o: Record<string, unknown> & { org_members?: unknown[] }) => ({
      ...o,
      org_members: o.org_members || [],
    })),
    managers: (managersResult.data || []).map((m: Record<string, unknown> & { id?: string; user_id: string; org_id?: string; role?: string; profiles?: unknown }) => ({
      id: m.id || '',
      user_id: m.user_id,
      org_id: m.org_id || '',
      role: m.role || 'manager',
      profiles: m.profiles,
    })),
    plans: plansResult.data || [],
  }
}
