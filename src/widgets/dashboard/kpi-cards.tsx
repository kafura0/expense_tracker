'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { Skeleton } from '@/shared/ui/skeleton'
import { Card, CardContent } from '@/shared/ui/card'
import { DollarSign, Receipt, TrendingDown, TrendingUp } from 'lucide-react'

export function KpiCards() {
  const supabase = createClient()

  const fetchKpis = async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Current month expenses
    const { data: currentMonth, error: currentError } = await supabase
      .from('expenses')
      .select('amount_cents')
      .eq('is_deleted', false)
      .gte('date', startOfMonth.toISOString())
      .lte('date', now.toISOString())

    // Last month expenses for comparison
    const { data: lastMonth, error: lastError } = await supabase
      .from('expenses')
      .select('amount_cents')
      .eq('is_deleted', false)
      .gte('date', startOfLastMonth.toISOString())
      .lte('date', endOfLastMonth.toISOString())

    if (currentError || lastError) {
      throw new Error('Failed to fetch KPIs')
    }

    const currentTotal = currentMonth?.reduce((sum, e) => sum + e.amount_cents, 0) || 0
    const lastTotal = lastMonth?.reduce((sum, e) => sum + e.amount_cents, 0) || 0
    const transactionCount = currentMonth?.length || 0
    const avgTransaction = transactionCount > 0 ? currentTotal / transactionCount : 0

    // Calculate change percentage
    const spendChange = lastTotal > 0 
      ? ((currentTotal - lastTotal) / lastTotal) * 100 
      : 0

    return {
      totalSpend: currentTotal,
      transactionCount,
      avgTransaction,
      spendChange,
    }
  }

  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ['kpis'],
    queryFn: fetchKpis,
  })

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card border-outline-variant">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-4 bg-surface-container-high" />
              <Skeleton className="h-8 w-32 mb-2 bg-surface-container-high" />
              <Skeleton className="h-4 w-20 bg-surface-container-high" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Error loading KPIs
      </div>
    )
  }

  const kpiItems = [
    {
      title: 'Total Spend',
      value: formatCurrency(kpis?.totalSpend || 0),
      change: kpis?.spendChange || 0,
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Transactions',
      value: kpis?.transactionCount?.toString() || '0',
      change: null,
      icon: Receipt,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      title: 'Avg Expense',
      value: formatCurrency(kpis?.avgTransaction || 0),
      change: null,
      icon: TrendingDown,
      color: 'text-tertiary',
      bgColor: 'bg-tertiary/10',
    },
    {
      title: 'Net Spend',
      value: formatCurrency(kpis?.totalSpend || 0),
      change: kpis?.spendChange || 0,
      icon: TrendingUp,
      color: 'text-primary-container',
      bgColor: 'bg-primary-container/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiItems.map((kpi) => (
        <Card key={kpi.title} className="glass-card border-outline-variant hover:emerald-glow transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">
                {kpi.title}
              </span>
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-headline text-xl text-on-surface font-bold">
                {kpi.value}
              </h3>
              {kpi.change !== null && (
                <div className="flex items-center gap-1">
                  {kpi.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-destructive" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-primary" />
                  )}
                  <span className={`text-xs font-medium ${kpi.change >= 0 ? 'text-destructive' : 'text-primary'}`}>
                    {Math.abs(kpi.change).toFixed(1)}%
                  </span>
                  <span className="text-xs text-on-surface-variant">vs last month</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}