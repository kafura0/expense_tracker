'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useActiveOrgId } from '@/shared/lib/org-helpers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths, startOfMonth } from 'date-fns'

interface TooltipPayload {
  active?: boolean
  payload?: Array<{
    value: number
    payload: {
      fullDate: string
    }
  }>
}

function TrendTooltip({ active, payload }: TooltipPayload) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl backdrop-blur-sm">
        <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.fullDate}</p>
        <p className="text-lg font-bold text-foreground">${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      </div>
    )
  }
  return null
}

export function SpendingTrendChart() {
  const supabase = createClient()
  const orgId = useActiveOrgId()

  const fetchTrendData = async () => {
    if (!orgId) throw new Error('No active organization')

    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))
    const now = new Date()

    const { data, error } = await supabase
      .from('expenses')
      .select('amount_cents, date')
      .eq('is_deleted', false)
      .eq('org_id', orgId)
      .gte('date', sixMonthsAgo.toISOString())
      .lte('date', now.toISOString())

    if (error) throw error

    const monthlyTotals: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const key = format(monthDate, 'yyyy-MM')
      monthlyTotals[key] = 0
    }

    for (const expense of data || []) {
      const key = format(new Date(expense.date), 'yyyy-MM')
      if (key in monthlyTotals) {
        monthlyTotals[key] += expense.amount_cents
      }
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
    queryKey: ['spending-trend', orgId],
    queryFn: fetchTrendData,
    enabled: orgId !== undefined,
  })

  if (orgId === undefined || orgId === null) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 bg-surface-container-high rounded-md" />
          <Skeleton className="h-4 w-56 bg-surface-container-high rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full bg-surface-container-high rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 bg-surface-container-high rounded-md" />
          <Skeleton className="h-4 w-56 bg-surface-container-high rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full bg-surface-container-high rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-outline-variant shadow-lg shadow-black/5"><CardContent className="p-6 text-center text-destructive">Error loading chart data</CardContent></Card>
  }

  if (!data || data.every(d => d.amount === 0)) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
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
    <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in delay-100">
      <CardHeader className="pb-2">
        <CardTitle>Spending Trend</CardTitle>
        <CardDescription>Monthly expenditures over the last 6 months</CardDescription>
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
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#4edea3', strokeWidth: 1, strokeDasharray: '4 4' }} />
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
