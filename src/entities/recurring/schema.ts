import { z } from 'zod'
import { SUPPORTED_CURRENCIES } from '@/entities/exchange-rate/types'

export const RECURRING_FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number]

export const recurringExpenseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  description: z.string().min(1, 'Description is required').max(100, 'Description is too long'),
  entry_type: z.enum(['expense', 'income']).default('expense'),
  amount_cents: z.number().int().min(1, 'Amount must be greater than 0').max(100000000),
  currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
  category_id: z.string().uuid().nullable(),
  frequency: z.enum(RECURRING_FREQUENCIES),
  start_date: z.string().min(1),
  next_due_date: z.string().min(1),
  is_active: z.boolean().default(true),
  last_generated_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const recurringExpenseInsertSchema = z.object({
  description: z.string().min(1, 'Description is required').max(100, 'Description is too long'),
  entry_type: z.enum(['expense', 'income']).default('expense'),
  amount_cents: z.number().int().min(1, 'Amount must be greater than 0').max(100000000),
  currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
  category_id: z.string().uuid().nullable(),
  frequency: z.enum(RECURRING_FREQUENCIES),
  start_date: z.string().min(1),
  /** Optional — defaults to `start_date` server-side. */
  next_due_date: z.string().optional(),
})

export const recurringExpenseUpdateSchema = z.object({
  description: z.string().min(1, 'Description is required').max(100, 'Description is too long').optional(),
  entry_type: z.enum(['expense', 'income']).optional(),
  amount_cents: z.number().int().min(1, 'Amount must be greater than 0').max(100000000).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  category_id: z.string().uuid().nullable().optional(),
  frequency: z.enum(RECURRING_FREQUENCIES).optional(),
  next_due_date: z.string().optional(),
  is_active: z.boolean().optional(),
})

export type RecurringExpense = z.infer<typeof recurringExpenseSchema>
export type RecurringExpenseInsert = z.infer<typeof recurringExpenseInsertSchema>
export type RecurringExpenseUpdate = z.infer<typeof recurringExpenseUpdateSchema>
