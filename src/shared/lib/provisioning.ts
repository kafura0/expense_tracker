/**
 * @fileoverview Service-role provisioning primitive (Story 1.5, FR-22, FR-34, AD-5).
 *
 * Approves a client request by creating the user (GoTrue, outside the DB
 * transaction), then committing the org + membership + subscription, and only
 * then sending email. The caller must already be a verified super admin; the
 * primitive re-verifies as defense-in-depth.
 *
 * This supersedes the `approve_client_request` RPC for the new-user path.
 */

import { createClient } from '@/shared/lib/supabase/server'
import { createServiceClient } from '@/shared/lib/supabase/service'
import { logAuditEvent } from '@/shared/lib/audit-logger'
import { sendWelcomeEmail } from '@/shared/lib/mailer'

export interface ProvisionResult {
  orgId: string
  userId: string
  createdUser: boolean
}

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function provisionApprovedRequest(input: {
  requestId: string
  email: string
  name: string
  businessName?: string | null
  planSlug: string
  assignOrgAdmin: boolean
}): Promise<ProvisionResult> {
  const supabase = await createClient()
  const service = createServiceClient()
  if (!service) throw new Error('Service client unavailable')

  const {
    data: { user: actor },
  } = await supabase.auth.getUser()
  if (!actor) throw new Error('Not authenticated')

  const { data: adminMembership } = await supabase
    .from('org_members')
    .select('id')
    .eq('user_id', actor.id)
    .eq('role', 'super_admin')
    .maybeSingle()
  if (!adminMembership) throw new Error('Not authorized')

  // Guard: the request must still be pending (re-approval impossible, FR-23)
  const { data: request, error: reqError } = await supabase
    .from('client_requests')
    .select('id, email, name, business_name, status')
    .eq('id', input.requestId)
    .maybeSingle()
  if (reqError || !request) throw new Error('Request not found')
  if (request.status !== 'pending') throw new Error('Request already reviewed')

  // 1. Create (or find) the auth user — outside the DB transaction
  const { data: list } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = (list?.users || []).find(
    (u) => u.email?.toLowerCase() === input.email.toLowerCase()
  )
  let userId = existing?.id
  let createdUser = false

  if (!userId) {
    const tempPassword = crypto.randomUUID().slice(0, 16) + 'A1!'
    const { data, error } = await service.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: input.name },
    })
    if (error) throw new Error(`Failed to create user: ${error.message}`)
    userId = data.user.id
    createdUser = true
  }
  if (!userId) throw new Error('Failed to create or find user')

  // 2. DB commit: org + membership + active subscription
  const orgName = input.businessName || input.name
  let orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  if (!orgSlug) orgSlug = `org-${crypto.randomUUID().slice(0, 8)}`

  const { data: orgId, error: orgError } = await supabase.rpc('create_org_for_user', {
    p_org_name: orgName,
    p_org_slug: orgSlug,
    p_user_id: userId,
    p_plan_slug: input.planSlug,
  })
  if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`)

  // First-admin bootstrap: promote the owner when requested (FR-34)
  if (input.assignOrgAdmin) {
    const { error: roleError } = await supabase
      .from('org_members')
      .update({ role: 'org_admin' })
      .eq('org_id', orgId)
      .eq('user_id', userId)
    if (roleError) throw new Error(`Failed to assign Org Admin: ${roleError.message}`)
  }

  // Mark the request approved (part of the commit)
  const { error: approveError } = await supabase
    .from('client_requests')
    .update({
      status: 'approved',
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .eq('status', 'pending')
  if (approveError) throw new Error(`Failed to mark request approved: ${approveError.message}`)

  // 3. Email only after both commit (AD-5)
  if (createdUser) {
    // New accounts get a password-set link from GoTrue so they can log in.
    const { error: inviteError } = await service.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/update-password`,
    })
    if (inviteError) {
      console.error(`[provisioning] invite email for ${input.email} failed: ${inviteError.message}`)
    }
  } else {
    await sendWelcomeEmail({ to: input.email, orgName })
  }

  // 4. Audit the approval (org-scoped; actor is super_admin)
  await logAuditEvent({
    action: 'request.approve',
    org_id: orgId as string,
    entity_type: 'client_request',
    entity_id: input.requestId,
    new_value: {
      plan: input.planSlug,
      assign_org_admin: input.assignOrgAdmin,
      created_user: createdUser,
    },
  })

  return { orgId: orgId as string, userId, createdUser }
}
