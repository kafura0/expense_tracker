'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const COLORS = ['#4edea3', '#c0c1ff', '#ffb3af', '#ffd5a0', '#ba68c8', '#4fc3f7']

export function CategoryChart() {
  const supabase = createClient()

  const fetchCategoryData = async () => {
    const now = new Date()
    const start = startOfMonth(now)
    const end = endOfMonth(now)

    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount_cents, category_id')
      .eq('is_deleted', false)
      .gte('date', start.toISOString())
      .lte('date', end.toISOString())

    if (expensesError) throw expensesError

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, icon')

    if (categoriesError) throw categoriesError

    // Aggregate by category
    const categoryTotals = expenses?.reduce((acc, expense) => {
      const catId = expense.category_id
      if (!acc[catId]) {
        acc[catId] = 0
      }
      acc[catId] += expense.amount_cents
      return acc
    }, {} as Record<string, number>) || {}

    // Map to chart data
    const chartData = Object.entries(categoryTotals)
      .map(([catId, total]) => {
        const category = categories?.find(c => c.id === catId)
        return {
          name: category?.name || 'Unknown',
          value: total / 100,
          icon: category?.icon || '📦',
        }
      })
      .sort((a, b) => b.value - a.value)

    return chartData
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['category-chart'],
    queryFn: fetchCategoryData,
  })

  if (isLoading) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-surface-container-high" />
          <Skeleton className="h-4 w-48 bg-surface-container-high" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-full bg-surface-container-high" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardContent className="p-6 text-center text-destructive">
          Error loading category data
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <CardTitle className="text-on-surface font-headline">Category Breakdown</CardTitle>
          <p className="text-sm text-on-surface-variant">Spending distribution by category</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-on-surface-variant">
            No spending data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-surface-container-high border border-outline-variant rounded-lg p-3 shadow-xl">
          <p className="text-sm text-on-surface-variant mb-1">
            {data.icon} {data.name}
          </p>
          <p className="font-bold text-on-surface">
            ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )
    }
    return null
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader>
        <CardTitle className="text-on-surface font-headline">Category Breakdown</CardTitle>
        <p className="text-sm text-on-surface-variant">Spending distribution by category</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="h-[300px] w-full lg:w-1/2" role="img" aria-label="Category breakdown pie chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full lg:w-1/2 space-y-3">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-on-surface">{item.icon} {item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-on-surface">
                    ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-on-surface-variant ml-2 text-sm">
                    ({((item.value / total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}