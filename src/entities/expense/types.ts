import type { Expense, ExpenseInsert, ExpenseUpdate } from './schema'

export type { Expense, ExpenseInsert, ExpenseUpdate }

export interface ExpenseFilters {
  search?: string
  category_id?: string
  currency?: string
  tax_applicable?: boolean
  date_from?: string
  date_to?: string
}

export interface ExpensePagination {
  page: number
  page_size: number
}

export interface ExpenseSort {
  field: 'date' | 'amount_cents' | 'category_id'
  direction: 'asc' | 'desc'
}

export interface ExpenseListParams {
  filters?: ExpenseFilters
  pagination?: ExpensePagination
  sort?: ExpenseSort
}

export interface ExpenseListResponse {
  data: Expense[]
  total: number
  page: number
  page_size: number
  total_pages: number
}