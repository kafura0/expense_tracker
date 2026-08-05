'use client'

import { useMemo } from 'react'
import type { DashboardScope } from '@/features/dashboard/scope'
import { useDashboardData, useCurrentMonthExpenses, useLastMonthExpenses } from '@/features/dashboard/use-dashboard-data'
import { formatMoney } from '@/shared/lib/currency'
import { sumInBaseCurrency } from '@/entities/expense/totals'
import { Skeleton } from '@/shared/ui/skeleton'
import { Card, CardContent } from '@/shared/ui/card'
import { ArrowUpRight, ArrowDownRight, Wallet, BarChart3, PiggyBank, Target } from 'lucide-react'

export function KpiCards({ scope }: { scope: DashboardScope }) {
  const { data, isLoading, error } = useDashboardData(scope)

  const currentMonth = useCurrentMonthExpenses(data?.expenses)
  const lastMonth = useLastMonthExpenses(data?.expenses)

  const kpis = useMemo(() => {
    if (!data) return undefined

    const { rates, budgets } = data

    // Currency-aware aggregation: totals convert each row to the scope's base
    // currency and only when a cached rate actually exists.
    const currentTotal = sumInBaseCurrency(currentMonth, scope.baseCurrency, rates)
    const lastTotal = sumInBaseCurrency(lastMonth, scope.baseCurrency, rates)
    const transactionCount = currentMonth.length
    const avgTransaction = transactionCount > 0 ? currentTotal / transactionCount : 0
    const spendChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0

    // Budget used = capped sum of category spend vs each budget, over total budget.
    const spentByCategory = currentMonth.reduce((acc, e) => {
      const catId = e.category_id
      if (!catId) return acc
      const converted = e.currency === scope.baseCurrency
        ? e.amount_cents
        : (rates[e.currency] ? Math.round(e.amount_cents / rates[e.currency]) : 0)
      acc[catId] = (acc[catId] || 0) + converted
      return acc
    }, {} as Record<string, number>)

    const totalBudget = budgets.reduce((sum, b) => sum + b.amount_cents, 0)
    const consumed = budgets.reduce((sum, b) => {
      const spent = spentByCategory[b.category_id] || 0
      return sum + Math.min(spent, b.amount_cents)
    }, 0)

    return {
      totalSpend: currentTotal,
      transactionCount,
      avgTransaction,
      spendChange,
      budgetUsed: totalBudget > 0 ? Math.min(100, (consumed / totalBudget) * 100) : null,
      budgetTotal: totalBudget,
    }
  }, [data, currentMonth, lastMonth, scope.baseCurrency])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card border-border shadow-lg shadow-black/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Skeleton className="h-4 w-24 bg-muted rounded-md" />
                <Skeleton className="h-10 w-10 rounded-xl bg-muted" />
              </div>
              <Skeleton className="h-9 w-32 mb-3 bg-muted rounded-md" />
              <Skeleton className="h-4 w-28 bg-muted rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">Error loading KPIs</div>
  }

  const kpiItems = [
    {
      title: 'Total Spend',
      value: formatMoney(kpis?.totalSpend || 0, scope.baseCurrency),
      change: kpis?.spendChange || 0,
      icon: Wallet,
      iconBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10',
      iconColor: 'text-emerald-500',
      borderColor: 'border-l-emerald-500',
    },
    {
      title: 'Transactions',
      value: kpis?.transactionCount?.toString() || '0',
      change: null,
      icon: BarChart3,
      iconBg: 'bg-gradient-to-br from-purple-500/20 to-purple-600/10',
      iconColor: 'text-purple-500',
      borderColor: 'border-l-purple-500',
    },
    {
      title: 'Avg Expense',
      value: formatMoney(kpis?.avgTransaction || 0, scope.baseCurrency),
      change: null,
      icon: PiggyBank,
      iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10',
      iconColor: 'text-amber-500',
      borderColor: 'border-l-amber-500',
    },
    {
      title: 'Budget Used',
      value: kpis?.budgetUsed != null ? `${kpis.budgetUsed.toFixed(0)}%` : '—',
      change: null,
      icon: Target,
      iconBg: 'bg-gradient-to-br from-sky-500/20 to-sky-600/10',
      iconColor: 'text-sky-500',
      borderColor: 'border-l-sky-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiItems.map((kpi, index) => (
        <Card
          key={kpi.title}
          className={`glass-card border-border border-l-2 ${kpi.borderColor} shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-0.5 transition-all duration-300 animate-fade-in ${
            index === 0 ? '' : index === 1 ? 'delay-75' : index === 2 ? 'delay-150' : 'delay-200'
          }`}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{kpi.title}</span>
              <div className={`p-2.5 rounded-xl ${kpi.iconBg} transition-transform duration-300 hover:scale-110`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</h3>
              {kpi.change !== null && (
                <div className="flex items-center gap-1.5">
                  {kpi.change > 0.05 ? (
                    <div className="flex items-center gap-0.5 text-red-500">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{Math.abs(kpi.change).toFixed(1)}%</span>
                    </div>
                  ) : kpi.change < -0.05 ? (
                    <div className="flex items-center gap-0.5 text-emerald-500">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{Math.abs(kpi.change).toFixed(1)}%</span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">0.0%</span>
                  )}
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
