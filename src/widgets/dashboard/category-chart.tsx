'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useActiveOrgId } from '@/shared/lib/org-helpers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
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
      icon: string
    }
  }>
}

function CategoryTooltip({ active, payload }: TooltipPayload) {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl backdrop-blur-sm">
        <p className="text-xs text-muted-foreground mb-1">{d.icon} {d.name}</p>
        <p className="text-lg font-bold text-foreground">${d.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
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

export function CategoryChart() {
  const supabase = createClient()
  const orgId = useActiveOrgId()

  const fetchCategoryData = async () => {
    if (!orgId) throw new Error('No active organization')
    const now = new Date()
    const start = startOfMonth(now)
    const end = endOfMonth(now)

    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount_cents, category_id')
      .eq('is_deleted', false)
      .eq('org_id', orgId)
      .gte('date', start.toISOString())
      .lte('date', end.toISOString())

    if (expensesError) throw expensesError

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, icon')
      .eq('org_id', orgId)

    if (categoriesError) throw categoriesError

    const categoryTotals = expenses?.reduce((acc, expense) => {
      const catId = expense.category_id
      if (!acc[catId]) acc[catId] = 0
      acc[catId] += expense.amount_cents
      return acc
    }, {} as Record<string, number>) || {}

    return Object.entries(categoryTotals)
      .map(([catId, total]) => {
        const category = categories?.find(c => c.id === catId)
        return { name: category?.name || 'Unknown', value: total / 100, icon: category?.icon || '📦' }
      })
      .sort((a, b) => b.value - a.value)
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['category-chart', orgId],
    queryFn: fetchCategoryData,
    enabled: orgId !== undefined,
  })

  if (orgId === undefined || orgId === null) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 bg-surface-container-high rounded-md" />
          <Skeleton className="h-4 w-48 bg-surface-container-high rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full rounded-xl overflow-hidden">
            <Skeleton className="h-full w-full bg-surface-container-high" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 bg-surface-container-high rounded-md" />
          <Skeleton className="h-4 w-48 bg-surface-container-high rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full rounded-xl overflow-hidden">
            <Skeleton className="h-full w-full bg-surface-container-high" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-outline-variant shadow-lg shadow-black/5"><CardContent className="p-6 text-center text-destructive">Error loading category data</CardContent></Card>
  }

  if (!data || data.length === 0) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
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
    <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in delay-150">
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
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
                  ))}
                </Pie>
                <Tooltip content={<CategoryTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full lg:w-1/2 space-y-3">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-foreground">{item.icon} {item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground text-sm">${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
