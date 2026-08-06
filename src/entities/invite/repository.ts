import { createClient } from '@/shared/lib/supabase/server'
import { inviteSchema, type Invite, type InviteInsert } from './schema'
import { randomBytes } from 'crypto'

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createInvite(data: InviteInsert): Promise<Invite> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('invites')
    .select('id')
    .eq('org_id', data.org_id)
    .eq('email', data.email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    throw new Error('A pending invite already exists for this email')
  }

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  const { data: invite, error } = await supabase
    .from('invites')
    .insert({
      ...data,
      token: generateToken(),
      invited_by: user.id,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create invite: ${error.message}`)
  return inviteSchema.parse(invite)
}

export async function listInvites(orgId: string): Promise<Invite[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch invites: ${error.message}`)
  return (data || []).map((item) => inviteSchema.parse(item))
}

export async function revokeInvite(orgId: string, inviteId: string): Promise<Invite | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (error) throw new Error(`Failed to revoke invite: ${error.message}`)
  return data ? inviteSchema.parse(data) : null
}

export async function resendInvite(orgId: string, inviteId: string): Promise<Invite | null> {
  const supabase = await createClient()

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('invites')
    .update({ status: 'pending', expires_at: expiresAt })
    .eq('id', inviteId)
    .eq('org_id', orgId)
    .in('status', ['pending', 'expired'])
    .select()
    .maybeSingle()

  if (error) throw new Error(`Failed to resend invite: ${error.message}`)
  return data ? inviteSchema.parse(data) : null
}

export async function findInviteByToken(token: string): Promise<Invite | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle()

  if (error) throw new Error(`Failed to find invite: ${error.message}`)
  if (!data) return null

  if (new Date(data.expires_at) < new Date()) {
    await supabase
      .from('invites')
      .update({ status: 'expired' })
      .eq('id', data.id)
    return null
  }

  return inviteSchema.parse(data)
}

export async function acceptInvite(token: string): Promise<string> {
  const supabase = await createClient()

  // The accept_invite RPC is SECURITY DEFINER and performs the membership
  // insert, the data reassignment, and the status flip atomically. It also
  // binds the token to the invitee's email (auth.uid() -> auth.users.email),
  // so a token can only be accepted by the invited account.
  const { data: orgId, error } = await supabase.rpc('accept_invite', {
    p_token: token,
  })

  if (error) throw new Error(error.message)
  if (!orgId) throw new Error('Failed to accept invite')

  return orgId as string
}
