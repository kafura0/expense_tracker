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

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

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

export async function revokeInvite(inviteId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)

  if (error) throw new Error(`Failed to revoke invite: ${error.message}`)
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

export async function acceptInvite(token: string, userId: string): Promise<string> {
  const supabase = await createClient()

  const invite = await findInviteByToken(token)
  if (!invite) throw new Error('Invite not found or expired')

  const { error: memberError } = await supabase
    .from('org_members')
    .insert({
      org_id: invite.org_id,
      user_id: userId,
      role: invite.role,
    })

  if (memberError) throw new Error(`Failed to add to organization: ${memberError.message}`)

  await supabase
    .from('profiles')
    .update({ org_id: invite.org_id })
    .eq('user_id', userId)
    .is('org_id', null)

  await supabase
    .from('categories')
    .update({ org_id: invite.org_id })
    .eq('user_id', userId)
    .is('org_id', null)

  await supabase
    .from('expenses')
    .update({ org_id: invite.org_id })
    .eq('user_id', userId)
    .is('org_id', null)

  await supabase
    .from('expense_settings')
    .update({ org_id: invite.org_id })
    .eq('user_id', userId)
    .is('org_id', null)

  await supabase
    .from('invites')
    .update({
      status: 'accepted',
      accepted_by: userId,
    })
    .eq('id', invite.id)

  return invite.org_id
}
