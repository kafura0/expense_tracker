'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { findInviteByToken, acceptInvite } from '@/entities/invite/repository'
import { setActiveOrgId } from '@/shared/lib/org-context'

export async function getInviteDetails(token: string) {
  try {
    const invite = await findInviteByToken(token)
    if (!invite) return { error: 'Invite not found or expired' }

    const supabase = await createClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', invite.org_id)
      .single()

    return {
      data: {
        email: invite.email,
        expires_at: invite.expires_at,
        org_name: org?.name || 'Organization',
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to load invite' }
  }
}

export async function acceptInviteAction(token: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Please log in first to accept this invite' }

    const orgId = await acceptInvite(token, user.id)
    await setActiveOrgId(orgId)

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to accept invite' }
  }
}
