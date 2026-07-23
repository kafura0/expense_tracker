'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useActiveOrgId } from '@/shared/lib/org-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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
      <div className="bg-surface-container-high border border-outline-variant rounded-lg p-3 shadow-xl">
        <p className="text-sm text-on-surface-variant mb-1">{payload[0].payload.fullDate}</p>
        <p className="font-bold text-on-surface">${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
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

  if (orgId === undefined) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader><Skeleton className="h-6 w-40 bg-surface-container-high" /><Skeleton className="h-4 w-48 bg-surface-container-high" /></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full bg-surface-container-high" /></CardContent>
      </Card>
    )
  }

  if (orgId === null) {
    return <Card className="glass-card border-outline-variant"><CardContent className="p-6 text-center text-on-surface-variant">No organization selected</CardContent></Card>
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader><Skeleton className="h-6 w-40 bg-surface-container-high" /><Skeleton className="h-4 w-48 bg-surface-container-high" /></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full bg-surface-container-high" /></CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-outline-variant"><CardContent className="p-6 text-center text-destructive">Error loading chart data</CardContent></Card>
  }

  if (!data || data.every(d => d.amount === 0)) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader><CardTitle className="text-on-surface font-headline">Spending Trend</CardTitle><p className="text-sm text-on-surface-variant">Monthly expenditures over the last 6 months</p></CardHeader>
        <CardContent><div className="h-[300px] flex items-center justify-center text-on-surface-variant">No spending data available</div></CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader><CardTitle className="text-on-surface font-headline">Spending Trend</CardTitle><p className="text-sm text-on-surface-variant">Monthly expenditures over the last 6 months</p></CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3c4a42" />
              <XAxis dataKey="month" stroke="#bbcabf" fontSize={12} tickLine={false} />
              <YAxis stroke="#bbcabf" fontSize={12} tickLine={false} tickFormatter={(value) => `$${value}`} />
              <Tooltip content={<TrendTooltip />} />
              <Line type="monotone" dataKey="amount" stroke="#4edea3" strokeWidth={3} dot={{ fill: '#4edea3', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#4edea3' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
