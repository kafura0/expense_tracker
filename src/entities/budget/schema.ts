import { z } from 'zod'

export const budgetSchema = z.object({
  id: z.string().uuid(),
  scope: z.enum(['user', 'org']),
  org_id: z.string().uuid().nullable(),
  user_id: z.string().uuid(),
  category_id: z.string().uuid(),
  amount_cents: z
    .number()
    .int()
    .min(0, 'Budget must be at least 0')
    .max(100000000, 'Budget exceeds maximum allowed value'),
  created_at: z.string().datetime({ offset: true }).optional(),
  updated_at: z.string().datetime({ offset: true }).optional(),
})

export type Budget = z.infer<typeof budgetSchema>
