'use server'

import { revalidatePath } from 'next/cache'
import { createExpense as createExpenseRepo, updateExpense as updateExpenseRepo, softDeleteExpense as softDeleteExpenseRepo, restoreExpense as restoreExpenseRepo } from '@/entities/expense/repository'
import { expenseInsertSchema, expenseUpdateSchema, type Expense, type ExpenseInsert, type ExpenseUpdate } from '@/entities/expense/schema'

export async function createExpense(expense: ExpenseInsert) {
  const parsed = expenseInsertSchema.safeParse(expense)
  if (!parsed.success) {
    return { data: null, error: 'Invalid expense data' }
  }
  try {
    const data = await createExpenseRepo(parsed.data)
    revalidatePath('/expenses')
    revalidatePath('/')
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create expense' }
  }
}

export async function updateExpense(id: string, expense: ExpenseUpdate) {
  const parsed = expenseUpdateSchema.safeParse(expense)
  if (!parsed.success) {
    return { data: null, error: 'Invalid expense data' }
  }
  try {
    const data = await updateExpenseRepo(id, parsed.data)
    revalidatePath('/expenses')
    revalidatePath('/')
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update expense' }
  }
}

export async function deleteExpense(id: string) {
  try {
    await softDeleteExpenseRepo(id)
    revalidatePath('/expenses')
    revalidatePath('/')
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete expense' }
  }
}

export async function restoreExpense(id: string) {
  try {
    const data = await restoreExpenseRepo(id)
    revalidatePath('/expenses')
    revalidatePath('/')
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to restore expense' }
  }
}

export async function duplicateExpense(id: string) {
  try {
    const { findExpenseById } = await import('@/entities/expense/repository')
    // findExpenseById selects a joined `categories` object that is NOT an
    // expenses column — it must be stripped before re-inserting the row.
    const expense = (await findExpenseById(id)) as Expense & { categories?: unknown }
    
    if (!expense) {
      return { data: null, error: 'Expense not found' }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, user_id: __, created_at: ___, updated_at: ____, categories: _____, ...expenseData } = expense
    
    const newExpense = await createExpenseRepo({
      ...expenseData,
      date: new Date().toISOString(),
    })

    revalidatePath('/expenses')
    revalidatePath('/')
    return { data: newExpense, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to duplicate expense' }
  }
}