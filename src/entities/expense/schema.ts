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
  org_id: z.string().uuid().nullable().optional(),
  amount_cents: z
    .number()
    .int()
    .min(1, 'Amount must be greater than 0')
    .max(100000000, 'Amount exceeds maximum allowed value'), // $1,000,000.00 max
  entry_type: z.enum(['expense', 'income']).default('expense'),
  currency: z.enum(['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']).default('USD'),
  converted_amount_cents: z.number().int().nullish(),
  converted_currency: z.string().nullish(),
  exchange_rate_used: z.number().min(0).max(1000000).nullish(),
  category_id: z.string().uuid().nullable().optional(),
  date: z.string().datetime({ offset: true }).or(z.date()),
  title: sanitizedString(100).nullish(),
  notes: sanitizedString(500).nullish(),
  tax_applicable: z.boolean().default(false),
  is_taxable: z.boolean().default(false),
  tax_rate_used: z.number().min(0).max(100).nullish(),
  tax_amount_cents: z.number().int().nullish(),
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

/**
 * Form-level schema for the client-side expense form.
 *
 * `expenseInsertSchema.date` requires an ISO 8601 offset string or a Date,
 * but the form submits a `<input type="datetime-local">` value
 * (`YYYY-MM-DDTHH:mm`) which fails that check. This schema additionally
 * accepts local datetime-local strings and converts them to ISO on submit.
 */
export const expenseFormSchema = expenseInsertSchema.extend({
  date: z
    .string()
    .datetime({ offset: true })
    .or(z.date())
    .or(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, 'Enter a valid date and time')
    ),
})

export type Expense = z.infer<typeof expenseSchema>
export type ExpenseInsert = z.infer<typeof expenseInsertSchema>
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>
