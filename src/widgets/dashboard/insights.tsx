'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { TrendingUp, TrendingDown, AlertCircle, Lightbulb } from 'lucide-react'

interface Insight {
  id: string
  type: 'increase' | 'decrease' | 'alert' | 'tip'
  title: string
  description: string
}

export function Insights() {
  const supabase = createClient()

  const fetchInsights = async (): Promise<Insight[]> => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Current month expenses
    const { data: currentExpenses } = await supabase
      .from('expenses')
      .select('amount_cents, category_id')
      .eq('is_deleted', false)
      .gte('date', currentMonthStart.toISOString())
      .lte('date', now.toISOString())

    // Last month expenses
    const { data: lastExpenses } = await supabase
      .from('expenses')
      .select('amount_cents, category_id')
      .eq('is_deleted', false)
      .gte('date', lastMonthStart.toISOString())
      .lte('date', lastMonthEnd.toISOString())

    // Categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')

    const insights: Insight[] = []

    // Calculate totals
    const currentTotal = currentExpenses?.reduce((sum, e) => sum + e.amount_cents, 0) || 0
    const lastTotal = lastExpenses?.reduce((sum, e) => sum + e.amount_cents, 0) || 0

    // Spending comparison
    if (lastTotal > 0) {
      const change = ((currentTotal - lastTotal) / lastTotal) * 100
      if (change > 10) {
        insights.push({
          id: 'spending-increase',
          type: 'increase',
          title: 'Spending Up',
          description: `You've spent ${change.toFixed(0)}% more than last month`,
        })
      } else if (change < -10) {
        insights.push({
          id: 'spending-decrease',
          type: 'decrease',
          title: 'Spending Down',
          description: `Great! You've spent ${Math.abs(change).toFixed(0)}% less than last month`,
        })
      }
    }

    // Category analysis
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

    // Find highest spending category
    const sortedCategories = Object.entries(currentByCategory)
      .sort(([, a], [, b]) => b - a)

    if (sortedCategories.length > 0) {
      const [topCatId, topAmount] = sortedCategories[0]
      const topCat = categories?.find(c => c.id === topCatId)
      if (topCat && currentTotal > 0) {
        const percentage = ((topAmount / currentTotal) * 100).toFixed(0)
        insights.push({
          id: 'top-category',
          type: 'tip',
          title: 'Top Category',
          description: `${percentage}% of spending is on ${topCat.name}`,
        })
      }
    }

    // Check for categories with big increases
    for (const [catId, currentAmount] of Object.entries(currentByCategory)) {
      const lastAmount = lastByCategory[catId] || 0
      if (lastAmount > 0 && currentAmount > lastAmount * 1.5) {
        const cat = categories?.find(c => c.id === catId)
        if (cat) {
          const increase = ((currentAmount - lastAmount) / lastAmount * 100).toFixed(0)
          insights.push({
            id: `category-increase-${catId}`,
            type: 'alert',
            title: `${cat.name} Alert`,
            description: `Spending on ${cat.name} increased by ${increase}%`,
          })
        }
      }
    }

    // Add a tip if no insights
    if (insights.length === 0) {
      insights.push({
        id: 'no-insights',
        type: 'tip',
        title: 'All Good!',
        description: 'Your spending is consistent this month',
      })
    }

    return insights.slice(0, 4)
  }

  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['insights'],
    queryFn: fetchInsights,
  })

  if (isLoading) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-surface-container-high" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-surface-container-high" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardContent className="p-6 text-center text-destructive">
          Error loading insights
        </CardContent>
      </Card>
    )
  }

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'increase':
        return <TrendingUp className="h-5 w-5 text-destructive" />
      case 'decrease':
        return <TrendingDown className="h-5 w-5 text-primary" />
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-tertiary" />
      case 'tip':
        return <Lightbulb className="h-5 w-5 text-secondary" />
    }
  }

  const getBgColor = (type: Insight['type']) => {
    switch (type) {
      case 'increase':
        return 'bg-destructive/10'
      case 'decrease':
        return 'bg-primary/10'
      case 'alert':
        return 'bg-tertiary/10'
      case 'tip':
        return 'bg-secondary/10'
    }
  }

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader>
        <CardTitle className="text-on-surface font-headline">Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights?.map((insight) => (
            <div 
              key={insight.id}
              className={`flex items-start gap-3 p-3 rounded-lg ${getBgColor(insight.type)}`}
            >
              <div className="mt-0.5">
                {getIcon(insight.type)}
              </div>
              <div>
                <p className="font-medium text-on-surface">{insight.title}</p>
                <p className="text-sm text-on-surface-variant">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}