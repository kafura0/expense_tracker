'use client'

/**
 * use-dashboard-data.ts
 *
 * Single consolidated data source for dashboard widgets. Every widget used to
 * fire its own Supabase queries on mount (a solo dashboard ran ~15 sequential
 * round trips, an org dashboard ~21) and several widgets re-queried the exact
 * same current-month expenses with slightly different shapes.
 *
 * This hook replaces that fan-out with one query (`dashboard-data`) that loads
 * the last six months of scoped expenses, the scoped categories and budgets,
 * and the base-currency rate map in parallel. Widgets derive their numbers
 * client-side from this shared payload and are deduped by TanStack Query's
 * cache (single key), collapsing the dashboard to 4 parallel round trips:
 * expenses, categories, budgets, rates.
 *
 * `sumInBaseCurrency` and `fetchBaseRates` remain the single source of truth
 * for currency-aware aggregation.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { startOfMonth, subMonths } from 'date-fns'
import {
  applyExpenseScope,
  applyCategoryScope,
  applyBudgetScope,
  type DashboardScope,
} from '@/features/dashboard/scope'
import { fetchBaseRates } from '@/entities/exchange-rate/base-rates'

export interface DashboardExpense {
  id: string
  title: string | null
  amount_cents: number
  currency: string
  date: string
  category_id: string | null
  user_id: string | null
  is_taxable: boolean | null
  tax_amount_cents: number | null
}

export interface DashboardCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export interface DashboardBudget {
  id: string
  category_id: string
  amount_cents: number
  categories: DashboardCategory | null
}

export interface DashboardData {
  /** Scoped expenses from the start of the sixth month back through today. */
  expenses: DashboardExpense[]
  categories: DashboardCategory[]
  budgets: DashboardBudget[]
  rates: Record<string, number>
}

export function useDashboardData(scope: DashboardScope) {
  const supabase = createClient()

  const query = useQuery<DashboardData>({
    queryKey: ['dashboard-data', scope],
    queryFn: async () => {
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))

      const [expenseRes, categoryRes, budgetRes] = await Promise.all([
        applyExpenseScope(
          supabase
            .from('expenses')
            .select(
              'id, title, amount_cents, currency, date, category_id, user_id, is_taxable, tax_amount_cents'
            )
            .eq('is_deleted', false)
            .eq('entry_type', 'expense')
            .gte('date', sixMonthsAgo.toISOString()),
          scope
        ),
        applyCategoryScope(supabase.from('categories').select('id, name, icon, color'), scope),
        applyBudgetScope(
          supabase
            .from('budgets')
            .select('id, category_id, amount_cents, categories(id, name, icon, color)'),
          scope
        ),
      ])

      if (expenseRes.error) throw expenseRes.error
      if (categoryRes.error) throw categoryRes.error
      if (budgetRes.error) throw budgetRes.error

      const rates = await fetchBaseRates(supabase, scope.baseCurrency)

      return {
        expenses: (expenseRes.data || []) as unknown as DashboardExpense[],
        categories: (categoryRes.data || []) as unknown as DashboardCategory[],
        budgets: (budgetRes.data || []) as unknown as DashboardBudget[],
        rates,
      }
    },
  })

  return query
}

/** True when the given expense falls on or after the supplied date. */
function isAfter(date: string, start: Date): boolean {
  return new Date(date) >= start
}

/** True when the given expense falls on or before the supplied date (inclusive). */
function isBefore(date: string, end: Date): boolean {
  return new Date(date) <= end
}

/**
 * Filter the shared six-month expense list down to the current calendar month
 * (first of month through now). Returns an empty array when the payload is
 * still loading so derivations can short-circuit on a stable reference.
 */
export function useCurrentMonthExpenses(expenses: DashboardExpense[] | undefined): DashboardExpense[] {
  return useMemo(() => {
    if (!expenses) return []
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return expenses.filter((e) => isAfter(e.date, start) && isBefore(e.date, now))
  }, [expenses])
}

/** Filter the shared expense list down to the previous calendar month. */
export function useLastMonthExpenses(expenses: DashboardExpense[] | undefined): DashboardExpense[] {
  return useMemo(() => {
    if (!expenses) return []
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return expenses.filter((e) => isAfter(e.date, start) && isBefore(e.date, end))
  }, [expenses])
}
