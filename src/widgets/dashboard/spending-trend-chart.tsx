'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export function SpendingTrendChart() {
  const supabase = createClient()

  const fetchTrendData = async () => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)

      const { data, error } = await supabase
        .from('expenses')
        .select('amount_cents')
        .eq('is_deleted', false)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())

      if (error) throw error

      const total = data?.reduce((sum, e) => sum + e.amount_cents, 0) || 0

      months.push({
        month: format(monthDate, 'MMM'),
        amount: total / 100,
        fullDate: format(monthDate, 'MMMM yyyy'),
      })
    }

    return months
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['spending-trend'],
    queryFn: fetchTrendData,
  })

  if (isLoading) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-surface-container-high" />
          <Skeleton className="h-4 w-48 bg-surface-container-high" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full bg-surface-container-high" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardContent className="p-6 text-center text-destructive">
          Error loading chart data
        </CardContent>
      </Card>
    )
  }

  if (!data || data.every(d => d.amount === 0)) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <CardTitle className="text-on-surface font-headline">Spending Trend</CardTitle>
          <p className="text-sm text-on-surface-variant">Monthly expenditures over the last 6 months</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-on-surface-variant">
            No spending data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-container-high border border-outline-variant rounded-lg p-3 shadow-xl">
          <p className="text-sm text-on-surface-variant mb-1">{payload[0].payload.fullDate}</p>
          <p className="font-bold text-on-surface">
            ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader>
        <CardTitle className="text-on-surface font-headline">Spending Trend</CardTitle>
        <p className="text-sm text-on-surface-variant">Monthly expenditures over the last 6 months</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full" role="img" aria-label="Spending trend chart showing monthly expenses">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3c4a42" />
              <XAxis 
                dataKey="month" 
                stroke="#bbcabf"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#bbcabf"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#4edea3" 
                strokeWidth={3}
                dot={{ fill: '#4edea3', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#4edea3' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}