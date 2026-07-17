'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { ExpenseTable } from '@/features/expenses/expense-table'
import { ExpenseFilters } from '@/features/expenses/expense-filters'
import { Button } from '@/shared/ui/button'
import { Plus } from 'lucide-react'
import { ExpenseDialog } from '@/features/expenses/expense-dialog'
import { deleteExpense, restoreExpense, duplicateExpense } from '@/features/expenses/actions'
import { useToast } from '@/shared/ui/toast'
import type { ExpenseListParams, ExpenseFilters as FilterType } from '@/entities/expense/types'

export default function ExpensesPage() {
  const [filters, setFilters] = useState<FilterType>({})
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [sortField, setSortField] = useState<'date' | 'amount_cents'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchExpenses = async (params: ExpenseListParams) => {
    let query = supabase
      .from('expenses')
      .select('*, categories(id, name, icon, color)', { count: 'exact' })
      .eq('is_deleted', false)

    if (params.filters?.search) {
      query = query.or(`notes.ilike.%${params.filters.search}%`)
    }
    if (params.filters?.category_id) {
      query = query.eq('category_id', params.filters.category_id)
    }
    if (params.filters?.currency) {
      query = query.eq('currency', params.filters.currency)
    }
    if (params.filters?.tax_applicable !== undefined) {
      query = query.eq('tax_applicable', params.filters.tax_applicable)
    }
    if (params.filters?.date_from) {
      query = query.gte('date', params.filters.date_from)
    }
    if (params.filters?.date_to) {
      query = query.lte('date', params.filters.date_to)
    }

    query = query.order(params.sort?.field || 'date', { 
      ascending: params.sort?.direction === 'asc' 
    })

    const from = ((params.pagination?.page || 1) - 1) * (params.pagination?.page_size || 20)
    const to = from + (params.pagination?.page_size || 20) - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      page: params.pagination?.page || 1,
      page_size: params.pagination?.page_size || 20,
      total_pages: Math.ceil((count || 0) / (params.pagination?.page_size || 20)),
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses', filters, page, pageSize, sortField, sortDirection],
    queryFn: () => fetchExpenses({
      filters,
      pagination: { page, page_size: pageSize },
      sort: { field: sortField, direction: sortDirection },
    }),
  })

  const handleSort = useCallback((field: 'date' | 'amount_cents') => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }, [sortField])

  const handleFilterChange = useCallback((newFilters: FilterType) => {
    setFilters(newFilters)
    setPage(1)
  }, [])

  const handleEdit = useCallback((expense: any) => {
    setEditingExpense(expense)
    setDialogOpen(true)
  }, [])

  const handleAddNew = useCallback(() => {
    setEditingExpense(null)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteExpense(id)
    
    if (result.error) {
      toast(result.error, 'error')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    
    // Show undo toast
    toast('Expense deleted. Click Undo to restore.', 'default')
    
    // Store the deleted expense for undo
    const deletedExpense = data?.data.find((e: any) => e.id === id)
    
    // Clear previous timeout if exists
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current)
    }
    
    // Set timeout for undo (30 seconds)
    undoTimeoutRef.current = setTimeout(async () => {
      // If undo wasn't clicked, the expense stays deleted
      undoTimeoutRef.current = null
    }, 30000)
    
    // For now, we'll just invalidate the query
    // In a real app, you'd store the deleted expense and provide an undo callback
  }, [data, queryClient, toast])

  const handleDuplicate = useCallback(async (id: string) => {
    const result = await duplicateExpense(id)
    
    if (result.error) {
      toast(result.error, 'error')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    toast('Expense duplicated successfully', 'success')
  }, [queryClient, toast])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Expenses</h1>
          <p className="text-on-surface-variant">
            Manage and track your expenses
          </p>
        </div>
        <Button onClick={handleAddNew} className="bg-primary-container text-on-primary-container hover:bg-primary-container/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <ExpenseFilters 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          Error loading expenses
        </div>
      ) : (
        <ExpenseTable
          data={data?.data || []}
          total={data?.total || 0}
          page={page}
          pageSize={pageSize}
          totalPages={data?.total_pages || 0}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onPageChange={setPage}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editingExpense}
      />
    </div>
  )
}