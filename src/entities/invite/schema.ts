import { z } from 'zod'

export const inviteSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  email: z.string().email(),
  token: z.string(),
  invited_by: z.string().uuid().nullable(),
  status: z.enum(['pending', 'accepted', 'revoked', 'expired']),
  accepted_by: z.string().uuid().nullable(),
  expires_at: z.string(),
  created_at: z.string(),
  send_id: z.string().nullable(),
  last_sent_at: z.string().nullable(),
})

export const inviteInsertSchema = inviteSchema.omit({
  id: true,
  token: true,
  invited_by: true,
  status: true,
  accepted_by: true,
  created_at: true,
  expires_at: true,
  send_id: true,
  last_sent_at: true,
})

export type Invite = z.infer<typeof inviteSchema>
export type InviteInsert = z.infer<typeof inviteInsertSchema>
