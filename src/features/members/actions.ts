/**
 * Roster server actions (Epic 3, FR-5..10).
 *
 * Authorization: every action verifies the caller can admin the active org via
 * the `can_admin_org` RPC (defense-in-depth — RLS is authoritative). Email
 * resolution uses the service-role helper (AD-9); only admins reach it.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { getActiveOrgId } from '@/shared/lib/org-context'
import { logAuditEvent } from '@/shared/lib/audit-logger'
import { lookupEmailsFor } from '@/shared/lib/service-users'

export type MemberRole = 'super_admin' | 'org_admin' | 'member'

export interface RosterMember {
  user_id: string
  display_name: string
  email: string
  role: MemberRole
  member_since: string
  is_suspended: boolean
  is_self: boolean
}

type ActionResult = { success?: boolean; error?: string }

async function requireAdmin(orgId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: allowed, error } = await supabase.rpc('can_admin_org', {
    target_org_id: orgId,
  })
  if (error || !allowed) return { error: 'You do not have permission to manage this organization' }
  return {}
}

async function fetchMembership(
  orgId: string,
  memberUserId: string,
): Promise<{ role?: MemberRole; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', memberUserId)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Member not found in this organization' }
  return { role: data.role as MemberRole }
}

async function countOrgAdmins(orgId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('org_members')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('role', 'org_admin')
  return count ?? 0
}

export async function getRoster(): Promise<
  { members?: RosterMember[]; error?: string }
> {
  try {
    const orgId = await getActiveOrgId()
    if (!orgId) return { error: 'No active organization' }
    const authz = await requireAdmin(orgId)
    if (authz.error) return { error: authz.error }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: memberships, error } = await supabase
      .from('org_members')
      .select('user_id, role, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }

    const userIds = (memberships ?? []).map((m) => m.user_id)
    const emailMap = await lookupEmailsFor(userIds)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, is_suspended')
      .in('user_id', userIds)
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]))

    const members: RosterMember[] = (memberships ?? []).map((m) => {
      const profile = profileMap.get(m.user_id)
      const email = emailMap.get(m.user_id) ?? ''
      return {
        user_id: m.user_id,
        display_name:
          profile?.display_name || email.split('@')[0] || 'Unknown',
        email,
        role: m.role as MemberRole,
        member_since: m.created_at,
        is_suspended: Boolean(profile?.is_suspended),
        is_self: m.user_id === user.id,
      }
    })

    return { members }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load the member list' }
  }
}

export async function updateMemberRole(
  memberUserId: string,
  newRole: 'org_admin' | 'member',
): Promise<ActionResult> {
  try {
    const orgId = await getActiveOrgId()
    if (!orgId) return { error: 'No active organization' }
    const authz = await requireAdmin(orgId)
    if (authz.error) return { error: authz.error }

    const target = await fetchMembership(orgId, memberUserId)
    if (target.error) return { error: target.error }
    const currentRole = target.role as MemberRole
    if (currentRole === 'super_admin') {
      return { error: 'Platform Super Admin memberships cannot be changed here' }
    }
    if (currentRole === newRole) return { error: 'No role change requested' }

    if (currentRole === 'org_admin' && newRole === 'member') {
      const admins = await countOrgAdmins(orgId)
      if (admins <= 1) return { error: 'You cannot demote the last Org Admin' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('org_members')
      .update({ role: newRole })
      .eq('org_id', orgId)
      .eq('user_id', memberUserId)
    if (error) return { error: error.message }

    await logAuditEvent({
      action: 'member.role_change',
      org_id: orgId,
      entity_type: 'org_member',
      entity_id: memberUserId,
      old_value: { role: currentRole },
      new_value: { role: newRole },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update the member role' }
  }
}

export async function removeMember(memberUserId: string): Promise<ActionResult> {
  try {
    const orgId = await getActiveOrgId()
    if (!orgId) return { error: 'No active organization' }
    const authz = await requireAdmin(orgId)
    if (authz.error) return { error: authz.error }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    if (memberUserId === user.id) return { error: 'You cannot remove yourself' }

    const target = await fetchMembership(orgId, memberUserId)
    if (target.error) return { error: target.error }
    const currentRole = target.role as MemberRole
    if (currentRole === 'super_admin') {
      return { error: 'Platform Super Admin memberships cannot be removed' }
    }
    if (currentRole === 'org_admin') {
      const admins = await countOrgAdmins(orgId)
      if (admins <= 1) return { error: 'You cannot remove the last Org Admin' }
    }

    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', memberUserId)
    if (error) return { error: error.message }

    await logAuditEvent({
      action: 'member.remove',
      org_id: orgId,
      entity_type: 'org_member',
      entity_id: memberUserId,
      old_value: { role: currentRole },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to remove the member' }
  }
}
