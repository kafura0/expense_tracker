/**
 * Invite server actions (Epic 4, FR-11..16).
 *
 * Every mutation is gated by `can_admin_org` (defense-in-depth; RLS is
 * authoritative), runs through the mailer module (AD-7) for delivery, and
 * records a send-id on the invite row for correlation (NFR-5).
 */

'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { getActiveOrgId } from '@/shared/lib/org-context'
import { createInvite, listInvites, revokeInvite, resendInvite } from '@/entities/invite/repository'
import { sendInviteEmail } from '@/shared/lib/mailer'
import { logAuditEvent } from '@/shared/lib/audit-logger'
import { lookupEmailsFor } from '@/shared/lib/service-users'
import { revalidatePath } from 'next/cache'

async function requireAdmin(orgId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: allowed, error } = await supabase.rpc('can_admin_org', {
    target_org_id: orgId,
  })
  if (error || !allowed) return { error: 'You do not have permission to manage invites' }
  return {}
}

async function getOrgName(orgId: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .maybeSingle()
  return data?.name || 'your organization'
}

async function recordSend(inviteId: string, sendId: string) {
  const supabase = await createClient()
  await supabase
    .from('invites')
    .update({ send_id: sendId, last_sent_at: new Date().toISOString() })
    .eq('id', inviteId)
}

export async function createInviteAction(email: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { data: null, error: 'Enter a valid email address' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const orgId = await getActiveOrgId()
    if (!orgId) return { data: null, error: 'No active organization' }

    const authz = await requireAdmin(orgId)
    if (authz.error) return { data: null, error: authz.error }

    const invite = await createInvite({ org_id: orgId, email: normalizedEmail })

    const orgName = await getOrgName(orgId)
    const send = await sendInviteEmail({
      to: normalizedEmail,
      token: invite.token,
      orgName,
    })
    await recordSend(invite.id, send.sendId)

    await logAuditEvent({
      action: 'invite.send',
      org_id: orgId,
      entity_type: 'invite',
      entity_id: invite.id,
      new_value: { email: normalizedEmail, expires_at: invite.expires_at, send_id: send.sendId },
    })

    revalidatePath('/settings')
    return { data: invite, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create invite',
    }
  }
}

export interface InviteListItem {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at: string
  created_at: string
  send_id: string | null
  last_sent_at: string | null
  invited_by_email: string | null
}

export async function listInvitesAction(): Promise<
  { data?: InviteListItem[]; error?: string | null }
> {
  try {
    const orgId = await getActiveOrgId()
    if (!orgId) return { data: [], error: null }

    const authz = await requireAdmin(orgId)
    if (authz.error) return { data: [], error: authz.error }

    const invites = await listInvites(orgId)

    const inviterIds = invites
      .map((i) => i.invited_by)
      .filter((id): id is string => Boolean(id))
    const emailMap = await lookupEmailsFor(inviterIds)

    return {
      data: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        status: invite.status,
        expires_at: invite.expires_at,
        created_at: invite.created_at,
        send_id: invite.send_id,
        last_sent_at: invite.last_sent_at,
        invited_by_email: invite.invited_by ? (emailMap.get(invite.invited_by) ?? null) : null,
      })),
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch invites' }
  }
}

export async function revokeInviteAction(inviteId: string) {
  try {
    const orgId = await getActiveOrgId()
    if (!orgId) return { error: 'No active organization' }
    const authz = await requireAdmin(orgId)
    if (authz.error) return { error: authz.error }

    const invite = await revokeInvite(orgId, inviteId)
    if (!invite) return { error: 'Invite not found or already resolved' }

    await logAuditEvent({
      action: 'invite.revoke',
      org_id: orgId,
      entity_type: 'invite',
      entity_id: inviteId,
      old_value: { email: invite.email, status: 'pending' },
      new_value: { status: 'revoked' },
    })

    revalidatePath('/settings')
    return { success: true, error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to revoke invite' }
  }
}

export async function resendInviteAction(inviteId: string) {
  try {
    const orgId = await getActiveOrgId()
    if (!orgId) return { error: 'No active organization' }
    const authz = await requireAdmin(orgId)
    if (authz.error) return { error: authz.error }

    const invite = await resendInvite(orgId, inviteId)
    if (!invite) return { error: 'Invite not found or cannot be resent' }

    const orgName = await getOrgName(orgId)
    const send = await sendInviteEmail({
      to: invite.email,
      token: invite.token,
      orgName,
    })
    await recordSend(invite.id, send.sendId)

    await logAuditEvent({
      action: 'invite.resend',
      org_id: orgId,
      entity_type: 'invite',
      entity_id: inviteId,
      old_value: { expires_at: invite.expires_at },
      new_value: { expires_at: invite.expires_at, send_id: send.sendId },
    })

    revalidatePath('/settings')
    return { success: true, error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to resend invite' }
  }
}
