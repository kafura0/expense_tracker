'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useDashboardScope, applyExpenseScope } from '@/features/dashboard/scope'
import { sumInBaseCurrency } from '@/entities/expense/totals'
import { fetchBaseRates } from '@/entities/exchange-rate/base-rates'
import { ExpenseTable, TableSkeleton } from '@/features/expenses/expense-table'
import { ExpenseFilters } from '@/features/expenses/expense-filters'
import { RecurringSection } from '@/features/recurring/recurring-section'
import { materializeDueRecurring } from '@/features/recurring/actions'
import { AttachmentsDialog } from '@/features/attachments/attachments-dialog'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowDownRight } from 'lucide-react'
import { ExpenseDialog } from '@/features/expenses/expense-dialog'
import { deleteExpense, duplicateExpense } from '@/features/expenses/actions'
import { useToast } from '@/shared/ui/toast'
import { cn } from '@/shared/lib/utils'
import { escapeLikePattern } from '@/shared/lib/like-escape'
import type { ExpenseListParams, ExpenseFilters as FilterType, ExpenseWithCategory } from '@/entities/expense/types'

export default function ExpensesPage() {
  const [filters, setFilters] = useState<FilterType>({})
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [sortField, setSortField] = useState<'date' | 'amount_cents'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null)
  const [attachmentExpense, setAttachmentExpense] = useState<ExpenseWithCategory | null>(null)
  const materializedScopeRef = useRef<string | null>(null)
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { scope, loading: scopeLoading } = useDashboardScope()

  // Materialize due recurring templates once per resolved scope, then refresh
  // both the expense list and the recurring section (next_due_date moved on).
  useEffect(() => {
    if (!scope) return
    const key = `${scope.orgId ?? scope.userId}:${scope.persona}`
    if (materializedScopeRef.current === key) return
    materializedScopeRef.current = key

    materializeDueRecurring().then((result) => {
      if (result.data?.created) {
        queryClient.invalidateQueries({ queryKey: ['expenses'] })
        queryClient.invalidateQueries({ queryKey: ['recurring'] })
      }
    })
  }, [scope, queryClient])

  const fetchExpenses = async (params: ExpenseListParams) => {
    if (!scope) throw new Error('No active scope')

    const buildQuery = (columns: string, opts?: { count?: 'exact' }) => {
      let query = supabase.from('expenses').select(columns, opts).eq('is_deleted', false)

      query = applyExpenseScope(query, scope)

      if (params.filters?.search) {
        const escaped = escapeLikePattern(params.filters.search)
        query = query.or(`notes.ilike.%${escaped}%,title.ilike.%${escaped}%`)
      }
      if (params.filters?.entry_type) {
        query = query.eq('entry_type', params.filters.entry_type)
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

      return query
    }

    const from = ((params.pagination?.page || 1) - 1) * (params.pagination?.page_size || 20)
    const to = from + (params.pagination?.page_size || 20) - 1

    const pageQuery = buildQuery('*, categories(id, name, icon, color)', { count: 'exact' })
      .order(params.sort?.field || 'date', {
        ascending: params.sort?.direction === 'asc'
      })
      .range(from, to)
    const totalsQuery = buildQuery('amount_cents, currency, entry_type')

    const base = scope?.baseCurrency || 'USD'
    const [pageResult, totalsResult, rates] = await Promise.all([
      pageQuery,
      totalsQuery,
      fetchBaseRates(supabase, base),
    ])
    const { data, error, count } = pageResult as {
      data: ExpenseWithCategory[] | null
      error: unknown
      count: number | null
    }
    const { data: totals, error: totalsError } = totalsResult as {
      data: Array<{ amount_cents: number; currency: string; entry_type: string }> | null
      error: unknown
    }

    if (error) throw error
    if (totalsError) throw totalsError

    const expenseTotal = sumInBaseCurrency(
      (totals || []).filter(t => t.entry_type === 'expense'),
      base,
      rates
    )
    const incomeTotal = sumInBaseCurrency(
      (totals || []).filter(t => t.entry_type === 'income'),
      base,
      rates
    )

    return {
      data: data || [],
      total: count || 0,
      page: params.pagination?.page || 1,
      page_size: params.pagination?.page_size || 20,
      total_pages: Math.ceil((count || 0) / (params.pagination?.page_size || 20)),
      totals: { expenseTotal, incomeTotal },
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses', filters, page, pageSize, sortField, sortDirection, scope?.orgId ?? scope?.userId ?? 'personal'],
    queryFn: () => fetchExpenses({
      filters,
      pagination: { page, page_size: pageSize },
      sort: { field: sortField, direction: sortDirection },
    }),
    enabled: scope !== null,
  })

  const stats = useMemo(() => {
    const expenseTotal = data?.totals?.expenseTotal || 0
    const incomeTotal = data?.totals?.incomeTotal || 0
    return {
      expenseTotal,
      incomeTotal,
      net: incomeTotal - expenseTotal,
      totalCount: data?.total || 0,
    }
  }, [data])

  const formatCurrency = (cents: number, currency = scope?.baseCurrency || 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100)
  }

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

  const handleEdit = useCallback((expense: ExpenseWithCategory) => {
    setEditingExpense(expense)
    setDialogOpen(true)
  }, [])

  const handleAddNew = useCallback(() => {
    setEditingExpense(null)
    setDialogOpen(true)
  }, [])

  const handleAttachments = useCallback((expense: ExpenseWithCategory) => {
    setAttachmentExpense(expense)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteExpense(id)

    if (result.error) {
      toast(result.error, 'error')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['expenses'] })

    // If we deleted the last row of a non-first page, step back so the
    // current page never renders out of range.
    if (data && data.data.length === 1 && page > 1) {
      setPage(page - 1)
    }

    toast('Expense deleted', 'default')
  }, [queryClient, toast, data, page])

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
          <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">
            Expenses
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and manage all your expense transactions
          </p>
        </div>
        <Button onClick={handleAddNew} className="shadow-md shadow-primary/20">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {scopeLoading || isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-28" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats && (stats.expenseTotal > 0 || stats.incomeTotal > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Expenses
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {formatCurrency(stats.expenseTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.totalCount.toLocaleString()} records
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Income
                  </p>
                  <p className="text-2xl font-bold text-emerald-500 mt-1 tabular-nums">
                    {formatCurrency(stats.incomeTotal)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Net Balance
                  </p>
                  <p className={cn(
                    "text-2xl font-bold mt-1 tabular-nums",
                    stats.net >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {formatCurrency(stats.net)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {scope ? (
        <RecurringSection scope={scope} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-9 w-56" />
        </div>
      )}

      <ExpenseFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {scopeLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !scope ? (
        <div className="text-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
            <ArrowDownRight className="h-8 w-8" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">Failed to load expenses</p>
          <p className="text-sm text-muted-foreground">Please try again later.</p>
        </div>
      ) : isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="text-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
            <ArrowDownRight className="h-8 w-8" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">Failed to load expenses</p>
          <p className="text-sm text-muted-foreground">Please try again later.</p>
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
          onAttachments={handleAttachments}
        />
      )}

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editingExpense}
      />

      <AttachmentsDialog
        open={!!attachmentExpense}
        onOpenChange={(open) => !open && setAttachmentExpense(null)}
        expense={attachmentExpense}
      />
    </div>
  )
}
