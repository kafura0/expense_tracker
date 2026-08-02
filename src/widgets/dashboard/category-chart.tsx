'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { applyExpenseScope, applyCategoryScope, type DashboardScope } from '@/features/dashboard/scope'
import { formatMoney } from '@/shared/lib/currency'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { CategoryIconTile } from '@/shared/ui/category-icon'
import { Skeleton } from '@/shared/ui/skeleton'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { startOfMonth, endOfMonth } from 'date-fns'

const COLORS = ['#4edea3', '#c0c1ff', '#ffb3af', '#ffd5a0', '#ba68c8', '#4fc3f7']

interface TooltipPayload {
  active?: boolean
  payload?: Array<{
    payload: {
      name: string
      value: number
      icon: string | null
      color: string | null
    }
  }>
}

function CategoryTooltip({ active, payload, currency }: TooltipPayload & { currency: string }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <CategoryIconTile icon={d.icon} color={d.color} className="h-7 w-7 rounded-lg" iconClassName="h-3.5 w-3.5" />
          <p className="text-xs text-muted-foreground">{d.name}</p>
        </div>
        <p className="text-lg font-bold text-foreground">{formatMoney(Math.round(d.value * 100), currency)}</p>
      </div>
    )
  }
  return null
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function CategoryChart({ scope }: { scope: DashboardScope }) {
  const supabase = createClient()

  const fetchCategoryData = async () => {
    const now = new Date()
    const start = startOfMonth(now)
    const end = endOfMonth(now)

    let expenseQuery = supabase
      .from('expenses')
      .select('amount_cents, category_id')
      .eq('is_deleted', false)
      .eq('entry_type', 'expense')
      .gte('date', start.toISOString())
      .lte('date', end.toISOString())
    expenseQuery = applyExpenseScope(expenseQuery, scope)
    const { data: expenses, error: expensesError } = await expenseQuery

    if (expensesError) throw expensesError

    const categoryQuery = applyCategoryScope(
      supabase.from('categories').select('id, name, icon, color'),
      scope
    )
    const { data: categories, error: categoriesError } = await categoryQuery

    if (categoriesError) throw categoriesError

    const categoryTotals = expenses?.reduce((acc, expense) => {
      const catId = expense.category_id
      if (!catId) return acc
      if (!acc[catId]) acc[catId] = 0
      acc[catId] += expense.amount_cents
      return acc
    }, {} as Record<string, number>) || {}

    return Object.entries(categoryTotals)
      .map(([catId, total]) => {
        const category = categories?.find(c => c.id === catId)
        return {
          name: category?.name || 'Unknown',
          value: total / 100,
          icon: category?.icon || null,
          color: category?.color || null,
        }
      })
      .sort((a, b) => b.value - a.value)
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['category-chart', scope],
    queryFn: fetchCategoryData,
  })

  if (isLoading) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 bg-muted rounded-md" />
          <Skeleton className="h-4 w-48 bg-muted rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full rounded-xl overflow-hidden">
            <Skeleton className="h-full w-full bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-border shadow-lg shadow-black/5"><CardContent className="p-6 text-center text-destructive">Error loading category data</CardContent></Card>
  }

  if (!data || data.length === 0) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Spending distribution by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">No spending data available</div>
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in delay-150">
      <CardHeader className="pb-2">
        <CardTitle>Category Breakdown</CardTitle>
        <CardDescription>Spending distribution by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="h-[300px] w-full lg:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={item.color || COLORS[index % COLORS.length]}
                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CategoryTooltip currency={scope.baseCurrency} />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full lg:w-1/2 space-y-3">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryIconTile icon={item.icon} color={item.color} className="h-8 w-8 rounded-lg" iconClassName="h-4 w-4" />
                  <span className="text-sm text-foreground truncate">{item.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-foreground text-sm">{formatMoney(Math.round(item.value * 100), scope.baseCurrency)}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({((item.value / total) * 100).toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
