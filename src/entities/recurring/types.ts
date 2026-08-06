import type { RecurringExpense, RecurringExpenseInsert, RecurringExpenseUpdate } from './schema'

export type { RecurringExpense, RecurringExpenseInsert, RecurringExpenseUpdate }

export type RecurringWithCategory = RecurringExpense & {
  categories?: { name: string; icon: string; color: string } | null
}

export interface RecurringActionResult<T = unknown> {
  data?: T
  error?: string | null
}
