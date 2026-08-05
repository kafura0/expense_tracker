'use client'

import { useMemo } from 'react'
import type { DashboardScope } from '@/features/dashboard/scope'
import { useDashboardData, useCurrentMonthExpenses } from '@/features/dashboard/use-dashboard-data'
import { formatMoney } from '@/shared/lib/currency'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { CategoryIconTile } from '@/shared/ui/category-icon'
import { Skeleton } from '@/shared/ui/skeleton'
import { Target } from 'lucide-react'

interface BudgetRow {
  categoryId: string
  categoryName: string
  icon: string | null
  color: string | null
  budgeted: number
  spent: number
  percent: number
}

export function BudgetSummary({ scope }: { scope: DashboardScope }) {
  const { data: query, isLoading, error } = useDashboardData(scope)
  const currentMonth = useCurrentMonthExpenses(query?.expenses)

  const data = useMemo(() => {
    if (!query) return undefined

    const { budgets, rates } = query

    const spentByCategory = currentMonth.reduce((acc, e) => {
      const catId = e.category_id
      if (!catId) return acc
      const converted = e.currency === scope.baseCurrency
        ? e.amount_cents
        : (rates[e.currency] ? Math.round(e.amount_cents / rates[e.currency]) : 0)
      acc[catId] = (acc[catId] || 0) + converted
      return acc
    }, {} as Record<string, number>)

    const rows: BudgetRow[] = budgets
      .map((b) => {
        const category = b.categories
        const budgeted = b.amount_cents
        const spent = spentByCategory[b.category_id] || 0
        return {
          categoryId: b.category_id,
          categoryName: category?.name || 'Unknown',
          icon: category?.icon || null,
          color: category?.color || null,
          budgeted,
          spent,
          percent: budgeted > 0 ? Math.min(100, (spent / budgeted) * 100) : 0,
        }
      })
      .sort((a, b) => b.percent - a.percent)

    const totalBudget = budgets.reduce((sum, b) => sum + b.amount_cents, 0)
    const totalSpent = rows.reduce((sum, r) => sum + Math.min(r.spent, r.budgeted), 0)
    const overallPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

    return { rows, totalBudget, totalSpent, overallPercent }
  }, [query, currentMonth, scope.baseCurrency])

  if (isLoading) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 bg-muted rounded-md" />
          <Skeleton className="h-4 w-48 bg-muted rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32 bg-muted rounded-md" />
                  <Skeleton className="h-4 w-20 bg-muted rounded-md" />
                </div>
                <Skeleton className="h-2.5 w-full bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-border shadow-lg shadow-black/5"><CardContent className="p-6 text-center text-destructive">Error loading budget data</CardContent></Card>
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Set monthly budgets from the Categories page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="p-4 rounded-2xl bg-muted/50">
              <Target className="h-8 w-8" />
            </div>
            <p className="font-medium">No budgets set</p>
            <p className="text-xs">Head to Categories to set monthly budget targets</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const barColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500'
    if (percent >= 80) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const statusLabel = data.overallPercent >= 100 ? 'Over budget' : data.overallPercent >= 80 ? 'Approaching limit' : 'On track'

  return (
    <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Target className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle>Budget vs Actual</CardTitle>
              <CardDescription>This month against your budget targets</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatMoney(data.totalSpent, scope.baseCurrency)}
              <span className="text-muted-foreground text-sm font-normal"> / {formatMoney(data.totalBudget, scope.baseCurrency)}</span>
            </p>
            <p className={`text-xs font-medium ${data.overallPercent >= 100 ? 'text-red-500' : data.overallPercent >= 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {data.overallPercent.toFixed(0)}% used · {statusLabel}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.rows.slice(0, 6).map((row) => (
            <div key={row.categoryId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2.5 font-medium text-foreground min-w-0">
                  <CategoryIconTile icon={row.icon} color={row.color} className="h-8 w-8 rounded-lg" iconClassName="h-4 w-4" />
                  <span className="truncate">{row.categoryName}</span>
                </span>
                <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatMoney(row.spent, scope.baseCurrency)}
                  <span className="text-muted-foreground/60"> / {formatMoney(row.budgeted, scope.baseCurrency)}</span>
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(row.percent)}`}
                  style={{ width: `${Math.max(2, Math.min(100, row.percent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{row.percent.toFixed(0)}% used</span>
                {row.spent > row.budgeted && <span className="text-red-500">{formatMoney(row.spent - row.budgeted, scope.baseCurrency)} over</span>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
