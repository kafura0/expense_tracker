'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useActiveOrgId } from '@/shared/lib/org-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { TrendingUp, TrendingDown, AlertCircle, Lightbulb, Sparkles } from 'lucide-react'

interface Insight {
  id: string
  type: 'increase' | 'decrease' | 'alert' | 'tip'
  title: string
  description: string
}

export function Insights() {
  const supabase = createClient()
  const orgId = useActiveOrgId()

  const fetchInsights = async (): Promise<Insight[]> => {
    if (!orgId) throw new Error('No active organization')
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const { data: currentExpenses, error: currentError } = await supabase
      .from('expenses')
      .select('amount_cents, category_id')
      .eq('is_deleted', false)
      .eq('org_id', orgId)
      .gte('date', currentMonthStart.toISOString())
      .lte('date', now.toISOString())

    if (currentError) throw new Error(`Failed to fetch current month expenses: ${currentError.message}`)

    const { data: lastExpenses, error: lastError } = await supabase
      .from('expenses')
      .select('amount_cents, category_id')
      .eq('is_deleted', false)
      .eq('org_id', orgId)
      .gte('date', lastMonthStart.toISOString())
      .lte('date', lastMonthEnd.toISOString())

    if (lastError) throw new Error(`Failed to fetch last month expenses: ${lastError.message}`)

    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('org_id', orgId)

    if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`)

    const insights: Insight[] = []
    const currentTotal = currentExpenses?.reduce((sum, e) => sum + e.amount_cents, 0) || 0
    const lastTotal = lastExpenses?.reduce((sum, e) => sum + e.amount_cents, 0) || 0

    if (lastTotal > 0) {
      const change = ((currentTotal - lastTotal) / lastTotal) * 100
      if (change > 10) {
        insights.push({ id: 'spending-increase', type: 'increase', title: 'Spending Up', description: `You've spent ${change.toFixed(0)}% more than last month` })
      } else if (change < -10) {
        insights.push({ id: 'spending-decrease', type: 'decrease', title: 'Spending Down', description: `Great! You've spent ${Math.abs(change).toFixed(0)}% less than last month` })
      }
    }

    const currentByCategory = currentExpenses?.reduce((acc, e) => {
      const catId = e.category_id
      if (!acc[catId]) acc[catId] = 0
      acc[catId] += e.amount_cents
      return acc
    }, {} as Record<string, number>) || {}

    const lastByCategory = lastExpenses?.reduce((acc, e) => {
      const catId = e.category_id
      if (!acc[catId]) acc[catId] = 0
      acc[catId] += e.amount_cents
      return acc
    }, {} as Record<string, number>) || {}

    const sortedCategories = Object.entries(currentByCategory).sort(([, a], [, b]) => b - a)
    if (sortedCategories.length > 0) {
      const [topCatId, topAmount] = sortedCategories[0]
      const topCat = categories?.find(c => c.id === topCatId)
      if (topCat && currentTotal > 0) {
        const percentage = ((topAmount / currentTotal) * 100).toFixed(0)
        insights.push({ id: 'top-category', type: 'tip', title: 'Top Category', description: `${percentage}% of spending is on ${topCat.name}` })
      }
    }

    for (const [catId, currentAmount] of Object.entries(currentByCategory)) {
      const lastAmount = lastByCategory[catId] || 0
      if (lastAmount > 0 && currentAmount > lastAmount * 1.5) {
        const cat = categories?.find(c => c.id === catId)
        if (cat) {
          const increase = ((currentAmount - lastAmount) / lastAmount * 100).toFixed(0)
          insights.push({ id: `category-increase-${catId}`, type: 'alert', title: `${cat.name} Alert`, description: `Spending on ${cat.name} increased by ${increase}%` })
        }
      }
    }

    if (insights.length === 0) {
      insights.push({ id: 'no-insights', type: 'tip', title: 'All Good!', description: 'Your spending is consistent this month' })
    }

    return insights.slice(0, 4)
  }

  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['insights', orgId],
    queryFn: fetchInsights,
    enabled: orgId !== undefined,
  })

  if (orgId === undefined || orgId === null) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 bg-surface-container-high rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                <Skeleton className="h-9 w-9 rounded-lg bg-surface-container-high shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28 bg-surface-container-high rounded-md" />
                  <Skeleton className="h-3 w-full bg-surface-container-high rounded-md" />
                </div>
              </div>
            ))}
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
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                <Skeleton className="h-9 w-9 rounded-lg bg-surface-container-high shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28 bg-surface-container-high rounded-md" />
                  <Skeleton className="h-3 w-full bg-surface-container-high rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-outline-variant shadow-lg shadow-black/5"><CardContent className="p-6 text-center text-destructive">Error loading insights</CardContent></Card>
  }

  if (!insights || insights.length === 0) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="p-4 rounded-2xl bg-muted/50">
              <Sparkles className="h-8 w-8" />
            </div>
            <p className="font-medium">No insights yet</p>
            <p className="text-xs">Add more expenses to get personalized insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getInsightConfig = (type: Insight['type']) => {
    switch (type) {
      case 'increase':
        return {
          icon: TrendingUp,
          iconBg: 'bg-red-500/10',
          iconColor: 'text-red-500',
          accentBorder: 'border-l-red-500',
          bg: 'bg-red-500/5',
        }
      case 'decrease':
        return {
          icon: TrendingDown,
          iconBg: 'bg-emerald-500/10',
          iconColor: 'text-emerald-500',
          accentBorder: 'border-l-emerald-500',
          bg: 'bg-emerald-500/5',
        }
      case 'alert':
        return {
          icon: AlertCircle,
          iconBg: 'bg-amber-500/10',
          iconColor: 'text-amber-500',
          accentBorder: 'border-l-amber-500',
          bg: 'bg-amber-500/5',
        }
      case 'tip':
        return {
          icon: Lightbulb,
          iconBg: 'bg-sky-500/10',
          iconColor: 'text-sky-500',
          accentBorder: 'border-l-sky-500',
          bg: 'bg-sky-500/5',
        }
    }
  }

  return (
    <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in delay-300">
      <CardHeader className="pb-2">
        <CardTitle>Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const config = getInsightConfig(insight.type)
            const Icon = config.icon
            return (
              <div
                key={insight.id}
                className={`flex items-start gap-3.5 p-4 rounded-xl border-l-2 ${config.accentBorder} ${config.bg} hover:shadow-md transition-all duration-200 animate-fade-in ${
                  index === 0 ? '' : index === 1 ? 'delay-75' : index === 2 ? 'delay-150' : 'delay-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${config.iconBg} shrink-0`}>
                  <Icon className={`h-4 w-4 ${config.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground">{insight.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{insight.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
