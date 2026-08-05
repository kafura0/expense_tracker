'use client'

import { useMemo } from 'react'
import type { DashboardScope } from '@/features/dashboard/scope'
import { useDashboardData, useCurrentMonthExpenses, useLastMonthExpenses } from '@/features/dashboard/use-dashboard-data'
import { sumInBaseCurrency } from '@/entities/expense/totals'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { TrendingUp, TrendingDown, AlertCircle, Lightbulb, Sparkles } from 'lucide-react'

interface Insight {
  id: string
  type: 'increase' | 'decrease' | 'alert' | 'tip'
  title: string
  description: string
}

export function Insights({ scope }: { scope: DashboardScope }) {
  const teamView = scope.persona === 'org' || scope.persona === 'platform-admin'
  const subject = teamView ? 'the team' : 'you'

  const { data: query, isLoading, error } = useDashboardData(scope)
  const currentMonth = useCurrentMonthExpenses(query?.expenses)
  const lastMonth = useLastMonthExpenses(query?.expenses)

  const insights = useMemo((): Insight[] | undefined => {
    if (!query) return undefined

    const { categories, rates } = query
    const list: Insight[] = []
    const currentTotal = sumInBaseCurrency(currentMonth, scope.baseCurrency, rates)
    const lastTotal = sumInBaseCurrency(lastMonth, scope.baseCurrency, rates)

    if (lastTotal > 0) {
      const change = ((currentTotal - lastTotal) / lastTotal) * 100
      if (change > 10) {
        list.push({ id: 'spending-increase', type: 'increase', title: 'Spending Up', description: `${subject === 'the team' ? 'The team has' : `You've`} spent ${change.toFixed(0)}% more than last month` })
      } else if (change < -10) {
        list.push({ id: 'spending-decrease', type: 'decrease', title: 'Spending Down', description: `Great! ${subject === 'the team' ? 'the team has' : `You've`} spent ${Math.abs(change).toFixed(0)}% less than last month` })
      }
    }

    const currentByCategory = currentMonth.reduce((acc, e) => {
      const catId = e.category_id
      if (!catId) return acc
      if (!acc[catId]) acc[catId] = 0
      acc[catId] += e.currency === scope.baseCurrency
        ? e.amount_cents
        : (rates[e.currency] ? Math.round(e.amount_cents / rates[e.currency]) : 0)
      return acc
    }, {} as Record<string, number>)

    const lastByCategory = lastMonth.reduce((acc, e) => {
      const catId = e.category_id
      if (!catId) return acc
      if (!acc[catId]) acc[catId] = 0
      acc[catId] += e.currency === scope.baseCurrency
        ? e.amount_cents
        : (rates[e.currency] ? Math.round(e.amount_cents / rates[e.currency]) : 0)
      return acc
    }, {} as Record<string, number>)

    const sortedCategories = Object.entries(currentByCategory).sort(([, a], [, b]) => b - a)
    if (sortedCategories.length > 0) {
      const [topCatId, topAmount] = sortedCategories[0]
      const topCat = categories.find(c => c.id === topCatId)
      if (topCat && currentTotal > 0) {
        const percentage = ((topAmount / currentTotal) * 100).toFixed(0)
        list.push({ id: 'top-category', type: 'tip', title: 'Top Category', description: `${percentage}% of spending is on ${topCat.name}` })
      }
    }

    for (const [catId, currentAmount] of Object.entries(currentByCategory)) {
      const lastAmount = lastByCategory[catId] || 0
      if (lastAmount > 0 && currentAmount > lastAmount * 1.5) {
        const cat = categories.find(c => c.id === catId)
        if (cat) {
          const increase = ((currentAmount - lastAmount) / lastAmount * 100).toFixed(0)
          list.push({ id: `category-increase-${catId}`, type: 'alert', title: `${cat.name} Alert`, description: `Spending on ${cat.name} increased by ${increase}%` })
        }
      }
    }

    if (list.length === 0) {
      list.push({ id: 'no-insights', type: 'tip', title: 'All Good!', description: `${teamView ? 'Team spending' : 'Your spending'} is consistent this month` })
    }

    return list.slice(0, 4)
  }, [query, currentMonth, lastMonth, scope.baseCurrency, subject, teamView])

  if (isLoading) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 bg-muted rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                <Skeleton className="h-9 w-9 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28 bg-muted rounded-md" />
                  <Skeleton className="h-3 w-full bg-muted rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-border shadow-lg shadow-black/5"><CardContent className="p-6 text-center text-destructive">Error loading insights</CardContent></Card>
  }

  if (!insights || insights.length === 0) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
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
    <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in delay-300">
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
