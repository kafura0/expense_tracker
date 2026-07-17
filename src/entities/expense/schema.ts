import { z } from 'zod'

export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  amount_cents: z.number().int().min(1, 'Amount must be greater than 0'),
  currency: z.enum(['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']).default('USD'),
  converted_amount_cents: z.number().int().optional(),
  converted_currency: z.string().optional(),
  exchange_rate_used: z.number().optional(),
  category_id: z.string().uuid().nullable().optional(),
  date: z.string().datetime({ offset: true }).or(z.date()),
  title: z.string().min(1, 'Title is required').max(100).optional(),
  notes: z.string().max(500).optional(),
  tax_applicable: z.boolean().default(false),
  is_taxable: z.boolean().default(false),
  tax_rate_used: z.number().optional(),
  tax_amount_cents: z.number().int().optional(),
  is_deleted: z.boolean().default(false),
  deleted_at: z.string().datetime({ offset: true }).nullable().optional(),
  created_at: z.string().datetime({ offset: true }).optional(),
  updated_at: z.string().datetime({ offset: true }).optional(),
})

export const expenseInsertSchema = expenseSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
  is_deleted: true,
  deleted_at: true,
})

export const expenseUpdateSchema = expenseInsertSchema.partial()

export type Expense = z.infer<typeof expenseSchema>
export type ExpenseInsert = z.infer<typeof expenseInsertSchema>
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>