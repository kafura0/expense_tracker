'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { acceptInvite } from '@/entities/invite/repository'
import { setActiveOrgId } from '@/shared/lib/org-context'

export type InviteState =
  | 'pending'
  | 'expired'
  | 'revoked'
  | 'accepted'
  | 'not_found'

export interface InviteDetails {
  email: string
  expires_at: string
  org_name: string
  state: InviteState
}

function stateFor(
  invite: { status: string; expires_at: string } | null
): InviteState {
  if (!invite) return 'not_found'
  if (invite.status === 'revoked') return 'revoked'
  if (invite.status === 'accepted') return 'accepted'
  if (invite.status === 'expired') return 'expired'
  if (new Date(invite.expires_at) < new Date()) return 'expired'
  return 'pending'
}

export async function getInviteDetails(token: string) {
  try {
    const supabase = await createClient()

    const { data: invite } = await supabase
      .from('invites')
      .select('email, status, expires_at, org_id')
      .eq('token', token)
      .maybeSingle()

    const state = stateFor(invite)

    let org_name = 'Organization'
    if (invite) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', invite.org_id)
        .single()
      org_name = org?.name || org_name
    }

    return {
      data: {
        email: invite?.email ?? '',
        expires_at: invite?.expires_at ?? '',
        org_name,
        state,
      } satisfies InviteDetails,
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

    const { data: invite } = await supabase
      .from('invites')
      .select('status, expires_at, email')
      .eq('token', token)
      .maybeSingle()

    if (!invite) return { error: 'invite.not_found' }
    if (invite.status === 'revoked') return { error: 'invite.revoked' }
    if (invite.status === 'accepted') return { error: 'invite.accepted' }
    if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
      return { error: 'invite.expired' }
    }

    const orgId = await acceptInvite(token)
    await setActiveOrgId(orgId)

    return { success: true, error: null }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept invite',
    }
  }
}
