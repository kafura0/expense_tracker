'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { applyExpenseScope, type DashboardScope } from '@/features/dashboard/scope'
import { formatMoney } from '@/shared/lib/currency'
import { sumInBaseCurrency } from '@/entities/expense/totals'
import { fetchBaseRates } from '@/entities/exchange-rate/base-rates'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths, startOfMonth } from 'date-fns'
import { TrendingUp } from 'lucide-react'

interface TooltipPayload {
  active?: boolean
  payload?: Array<{
    value: number
    payload: {
      fullDate: string
    }
  }>
}

function TrendTooltip({ active, payload, currency }: TooltipPayload & { currency: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl backdrop-blur-sm">
        <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.fullDate}</p>
        <p className="text-lg font-bold text-foreground">
          {formatMoney(Math.round(payload[0].value * 100), currency)}
        </p>
      </div>
    )
  }
  return null
}

export function SpendingTrendChart({ scope }: { scope: DashboardScope }) {
  const supabase = createClient()

  const fetchTrendData = async () => {
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))
    const now = new Date()

    let query = supabase
      .from('expenses')
      .select('amount_cents, currency, date')
      .eq('is_deleted', false)
      .eq('entry_type', 'expense')
      .gte('date', sixMonthsAgo.toISOString())
      .lte('date', now.toISOString())
    query = applyExpenseScope(query, scope)
    const { data, error } = await query

    if (error) throw error

    const rates = await fetchBaseRates(supabase, scope.baseCurrency)

    const monthlyTotals: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const key = format(monthDate, 'yyyy-MM')
      monthlyTotals[key] = 0
    }

    const byMonth: Record<string, Array<{ amount_cents: number; currency: string }>> = {}
    for (const expense of data || []) {
      const key = format(new Date(expense.date), 'yyyy-MM')
      if (!(key in monthlyTotals)) continue
      if (!byMonth[key]) byMonth[key] = []
      byMonth[key].push({ amount_cents: expense.amount_cents, currency: expense.currency })
    }

    for (const key of Object.keys(monthlyTotals)) {
      monthlyTotals[key] = sumInBaseCurrency(byMonth[key] || [], scope.baseCurrency, rates)
    }

    return Object.entries(monthlyTotals).map(([key, total]) => {
      const monthDate = new Date(key + '-01')
      return {
        month: format(monthDate, 'MMM'),
        amount: total / 100,
        fullDate: format(monthDate, 'MMMM yyyy'),
      }
    })
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['spending-trend', scope],
    queryFn: fetchTrendData,
  })

  if (isLoading) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 bg-muted rounded-md" />
          <Skeleton className="h-4 w-56 bg-muted rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full bg-muted rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-border shadow-lg shadow-black/5"><CardContent className="p-6 text-center text-destructive">Error loading chart data</CardContent></Card>
  }

  if (!data || data.every(d => d.amount === 0)) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle>Spending Trend</CardTitle>
          <CardDescription>Monthly expenditures over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">No spending data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in delay-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Spending Trend</CardTitle>
            <CardDescription>Monthly expenditures over the last 6 months</CardDescription>
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4edea3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4edea3" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatMoney(value * 100, scope.baseCurrency)}
              />
              <Tooltip content={<TrendTooltip currency={scope.baseCurrency} />} cursor={{ stroke: '#4edea3', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#4edea3"
                strokeWidth={3}
                fill="url(#spendingGradient)"
                dot={{ fill: '#4edea3', strokeWidth: 2, r: 4, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#4edea3', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
