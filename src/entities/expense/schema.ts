import { z } from 'zod'

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Custom Zod effect for string sanitization
 */
const sanitizedString = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .transform(sanitizeString)

export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  org_id: z.string().uuid().optional(),
  amount_cents: z
    .number()
    .int()
    .min(1, 'Amount must be greater than 0')
    .max(100000000, 'Amount exceeds maximum allowed value'), // $1,000,000.00 max
  currency: z.enum(['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']).default('USD'),
  converted_amount_cents: z.number().int().optional(),
  converted_currency: z.string().optional(),
  exchange_rate_used: z.number().min(0).max(1000000).optional(),
  category_id: z.string().uuid().nullable().optional(),
  date: z.string().datetime({ offset: true }).or(z.date()),
  title: sanitizedString(100).optional(),
  notes: sanitizedString(500).optional(),
  tax_applicable: z.boolean().default(false),
  is_taxable: z.boolean().default(false),
  tax_rate_used: z.number().min(0).max(100).optional(),
  tax_amount_cents: z.number().int().optional(),
  is_deleted: z.boolean().default(false),
  deleted_at: z.string().datetime({ offset: true }).nullable().optional(),
  created_at: z.string().datetime({ offset: true }).optional(),
  updated_at: z.string().datetime({ offset: true }).optional(),
})

export const expenseInsertSchema = expenseSchema.omit({
  id: true,
  user_id: true,
  org_id: true,
  created_at: true,
  updated_at: true,
  is_deleted: true,
  deleted_at: true,
})

export const expenseUpdateSchema = expenseInsertSchema.partial()

export type Expense = z.infer<typeof expenseSchema>
export type ExpenseInsert = z.infer<typeof expenseInsertSchema>
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>
