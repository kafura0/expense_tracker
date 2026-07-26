'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useActiveOrgId } from '@/shared/lib/org-helpers'
import { Skeleton } from '@/shared/ui/skeleton'
import { Card, CardContent } from '@/shared/ui/card'
import { ArrowUpRight, ArrowDownRight, Wallet, BarChart3, PiggyBank, Target } from 'lucide-react'

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function KpiCards() {
  const supabase = createClient()

  const fetchKpis = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    let currentQuery = supabase
      .from('expenses')
      .select('amount_cents')
      .eq('is_deleted', false)
      .gte('date', startOfMonth.toISOString())
      .lte('date', now.toISOString())
    if (orgId) {
      currentQuery = currentQuery.eq('org_id', orgId)
    } else {
      currentQuery = currentQuery.eq('user_id', user.id).is('org_id', null)
    }
    const { data: currentMonth, error: currentError } = await currentQuery

    let lastQuery = supabase
      .from('expenses')
      .select('amount_cents')
      .eq('is_deleted', false)
      .gte('date', startOfLastMonth.toISOString())
      .lte('date', endOfLastMonth.toISOString())
    if (orgId) {
      lastQuery = lastQuery.eq('org_id', orgId)
    } else {
      lastQuery = lastQuery.eq('user_id', user.id).is('org_id', null)
    }
    const { data: lastMonth, error: lastError } = await lastQuery

    if (currentError || lastError) throw new Error('Failed to fetch KPIs')

    const currentTotal = currentMonth?.reduce((sum, e) => sum + e.amount_cents, 0) || 0
    const lastTotal = lastMonth?.reduce((sum, e) => sum + e.amount_cents, 0) || 0
    const transactionCount = currentMonth?.length || 0
    const avgTransaction = transactionCount > 0 ? currentTotal / transactionCount : 0
    const spendChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0

    return { totalSpend: currentTotal, transactionCount, avgTransaction, spendChange }
  }

  const orgId = useActiveOrgId()
  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ['kpis', orgId],
    queryFn: fetchKpis,
    enabled: orgId !== undefined,
  })

  if (orgId === undefined || orgId === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card border-outline-variant shadow-lg shadow-black/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Skeleton className="h-4 w-24 bg-surface-container-high rounded-md" />
                <Skeleton className="h-10 w-10 rounded-xl bg-surface-container-high" />
              </div>
              <Skeleton className="h-9 w-32 mb-3 bg-surface-container-high rounded-md" />
              <Skeleton className="h-4 w-28 bg-surface-container-high rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card border-outline-variant shadow-lg shadow-black/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Skeleton className="h-4 w-24 bg-surface-container-high rounded-md" />
                <Skeleton className="h-10 w-10 rounded-xl bg-surface-container-high" />
              </div>
              <Skeleton className="h-9 w-32 mb-3 bg-surface-container-high rounded-md" />
              <Skeleton className="h-4 w-28 bg-surface-container-high rounded-md" />
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
      value: formatCurrency(kpis?.totalSpend || 0),
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
      value: formatCurrency(kpis?.avgTransaction || 0),
      change: null,
      icon: PiggyBank,
      iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10',
      iconColor: 'text-amber-500',
      borderColor: 'border-l-amber-500',
    },
    {
      title: 'Budget Used',
      value: formatCurrency(kpis?.totalSpend || 0),
      change: kpis?.spendChange || 0,
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
          className={`glass-card border-outline-variant border-l-2 ${kpi.borderColor} shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-0.5 transition-all duration-300 animate-fade-in ${
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
                  {kpi.change >= 0 ? (
                    <div className="flex items-center gap-0.5 text-red-500">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{Math.abs(kpi.change).toFixed(1)}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 text-emerald-500">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{Math.abs(kpi.change).toFixed(1)}%</span>
                    </div>
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
