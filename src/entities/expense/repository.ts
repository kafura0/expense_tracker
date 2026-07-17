import { createClient } from '@/shared/lib/supabase/server'
import { expenseSchema, type Expense, type ExpenseInsert, type ExpenseUpdate } from './schema'
import type { ExpenseListParams, ExpenseListResponse } from './types'

export async function findAllExpenses(params: ExpenseListParams = {}): Promise<ExpenseListResponse> {
  const supabase = await createClient()
  const { filters = {}, pagination = { page: 1, page_size: 20 }, sort = { field: 'date', direction: 'desc' } } = params

  let query = supabase
    .from('expenses')
    .select('*, categories(id, name, icon, color)', { count: 'exact' })
    .eq('is_deleted', false)

  // Apply filters
  if (filters.search) {
    query = query.or(`notes.ilike.%${filters.search}%,categories.name.ilike.%${filters.search}%`)
  }
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id)
  }
  if (filters.currency) {
    query = query.eq('currency', filters.currency)
  }
  if (filters.tax_applicable !== undefined) {
    query = query.eq('tax_applicable', filters.tax_applicable)
  }
  if (filters.date_from) {
    query = query.gte('date', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('date', filters.date_to)
  }

  // Apply sorting
  query = query.order(sort.field, { ascending: sort.direction === 'asc' })

  // Apply pagination
  const from = (pagination.page - 1) * pagination.page_size
  const to = from + pagination.page_size - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`)
  }

  const total = count || 0
  const total_pages = Math.ceil(total / pagination.page_size)

  return {
    data: data || [],
    total,
    page: pagination.page,
    page_size: pagination.page_size,
    total_pages,
  }
}

export async function findExpenseById(id: string): Promise<Expense | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('expenses')
    .select('*, categories(id, name, icon, color)')
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch expense: ${error.message}`)
  }

  return data
}

export async function createExpense(expense: ExpenseInsert): Promise<Expense> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...expense,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create expense: ${error.message}`)
  }

  return expenseSchema.parse(data)
}

export async function updateExpense(id: string, expense: ExpenseUpdate): Promise<Expense> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('expenses')
    .update({
      ...expense,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('is_deleted', false)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update expense: ${error.message}`)
  }

  return expenseSchema.parse(data)
}

export async function softDeleteExpense(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('expenses')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete expense: ${error.message}`)
  }
}

export async function restoreExpense(id: string): Promise<Expense> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('expenses')
    .update({
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to restore expense: ${error.message}`)
  }

  return expenseSchema.parse(data)
}