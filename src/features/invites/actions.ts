'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { getActiveOrgId } from '@/shared/lib/org-context'
import { createInvite, listInvites, revokeInvite } from '@/entities/invite/repository'
import { revalidatePath } from 'next/cache'

export async function createInviteAction(email: string, role: 'manager' | 'client' = 'client') {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const orgId = await getActiveOrgId()
    if (!orgId) return { error: 'No active organization' }

    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .single()

    if (!membership) {
      return { error: 'Only organization members can invite others' }
    }

    const invite = await createInvite({ org_id: orgId, email, role })
    revalidatePath('/')
    return { data: invite, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create invite' }
  }
}

export async function listInvitesAction() {
  try {
    const orgId = await getActiveOrgId()
    if (!orgId) return { data: [], error: null }

    const invites = await listInvites(orgId)
    return { data: invites, error: null }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to fetch invites' }
  }
}

export async function revokeInviteAction(inviteId: string) {
  try {
    await revokeInvite(inviteId)
    revalidatePath('/')
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to revoke invite' }
  }
}
