import { z } from 'zod'

export const orgSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  created_by: z.string().uuid().nullable().optional(),
  status: z.enum(['pending', 'active', 'suspended', 'cancelled']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const orgMemberSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['super_admin', 'manager', 'client']),
  created_at: z.string().datetime(),
})

export const clientRequestSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  business_name: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  message: z.string().max(1000).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  reviewed_by: z.string().uuid().nullable().optional(),
  reviewed_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
})

export const planSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  price_monthly_cents: z.number().int(),
  price_yearly_cents: z.number().int(),
  max_members: z.number().int(),
  max_expenses_per_month: z.number().int(),
  features: z.record(z.boolean()),
  created_at: z.string().datetime(),
})

export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  status: z.enum(['active', 'trialing', 'cancelled', 'expired', 'past_due']),
  stripe_customer_id: z.string().nullable().optional(),
  stripe_subscription_id: z.string().nullable().optional(),
  current_period_start: z.string().datetime().nullable().optional(),
  current_period_end: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Org = z.infer<typeof orgSchema>
export type OrgMember = z.infer<typeof orgMemberSchema>
export type ClientRequest = z.infer<typeof clientRequestSchema>
export type Plan = z.infer<typeof planSchema>
export type Subscription = z.infer<typeof subscriptionSchema>
