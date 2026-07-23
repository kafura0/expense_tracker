'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useActiveOrgId } from '@/shared/lib/org-helpers'
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
  const orgId = useActiveOrgId()

  const fetchInsights = async (): Promise<Insight[]> => {
    if (!orgId) throw new Error('No active organization')
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    /**
     * ERROR HANDLING: All three queries now check for errors.
     * Previously, errors were silently ignored, which meant:
     * - If the expenses table was empty or inaccessible, insights showed misleading data
     * - If RLS denied access, the component showed "All Good!" instead of an error
     * - Debugging was impossible because errors were swallowed
     *
     * Now, any query failure throws immediately, which React Query catches
     * and displays as an error state in the UI.
     */
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

  if (orgId === undefined) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader><Skeleton className="h-6 w-40 bg-surface-container-high" /></CardHeader>
        <CardContent><div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-surface-container-high" />)}</div></CardContent>
      </Card>
    )
  }

  if (orgId === null) {
    return <Card className="glass-card border-outline-variant"><CardContent className="p-6 text-center text-on-surface-variant">No organization selected</CardContent></Card>
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader><Skeleton className="h-6 w-40 bg-surface-container-high" /></CardHeader>
        <CardContent><div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-surface-container-high" />)}</div></CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-outline-variant"><CardContent className="p-6 text-center text-destructive">Error loading insights</CardContent></Card>
  }

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'increase': return <TrendingUp className="h-5 w-5 text-destructive" />
      case 'decrease': return <TrendingDown className="h-5 w-5 text-primary" />
      case 'alert': return <AlertCircle className="h-5 w-5 text-tertiary" />
      case 'tip': return <Lightbulb className="h-5 w-5 text-secondary" />
    }
  }

  const getBgColor = (type: Insight['type']) => {
    switch (type) {
      case 'increase': return 'bg-destructive/10'
      case 'decrease': return 'bg-primary/10'
      case 'alert': return 'bg-tertiary/10'
      case 'tip': return 'bg-secondary/10'
    }
  }

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader><CardTitle className="text-on-surface font-headline">Insights</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights?.map((insight) => (
            <div key={insight.id} className={`flex items-start gap-3 p-3 rounded-lg ${getBgColor(insight.type)}`}>
              <div className="mt-0.5">{getIcon(insight.type)}</div>
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
