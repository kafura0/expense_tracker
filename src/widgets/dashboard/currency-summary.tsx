'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useActiveOrgId } from '@/shared/lib/org-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Globe } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'

export function CurrencySummary() {
  const supabase = createClient()
  const orgId = useActiveOrgId()

  const fetchCurrencySummary = async () => {
    if (!orgId) throw new Error('No active organization')
    const now = new Date()
    const start = startOfMonth(now)
    const end = endOfMonth(now)

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount_cents, currency')
      .eq('is_deleted', false)
      .eq('org_id', orgId)
      .gte('date', start.toISOString())
      .lte('date', end.toISOString())

    if (error) throw error

    const byCurrency = expenses?.reduce((acc, expense) => {
      const curr = expense.currency
      if (!acc[curr]) acc[curr] = { count: 0, total: 0 }
      acc[curr].count++
      acc[curr].total += expense.amount_cents
      return acc
    }, {} as Record<string, { count: number; total: number }>) || {}

    return Object.entries(byCurrency)
      .map(([currency, data]) => ({
        currency,
        count: data.count,
        total: data.total,
        formatted: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(data.total / 100),
      }))
      .sort((a, b) => b.total - a.total)
  }

  const { data: currencies, isLoading, error } = useQuery({
    queryKey: ['currency-summary', orgId],
    queryFn: fetchCurrencySummary,
    enabled: orgId !== undefined,
  })

  if (orgId === undefined) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader><Skeleton className="h-6 w-40 bg-surface-container-high" /><Skeleton className="h-4 w-48 bg-surface-container-high" /></CardHeader>
        <CardContent><div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-surface-container-high" />)}</div></CardContent>
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
        <CardContent><div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-surface-container-high" />)}</div></CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-outline-variant"><CardContent className="p-6 text-center text-destructive">Error loading currency summary</CardContent></Card>
  }

  if (!currencies || currencies.length === 0) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10"><Globe className="h-5 w-5 text-secondary" /></div>
            <div><CardTitle className="text-on-surface font-headline">Currency Breakdown</CardTitle><p className="text-sm text-on-surface-variant">Current month by currency</p></div>
          </div>
        </CardHeader>
        <CardContent><div className="h-[100px] flex items-center justify-center text-on-surface-variant">No expenses this month</div></CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/10"><Globe className="h-5 w-5 text-secondary" /></div>
          <div><CardTitle className="text-on-surface font-headline">Currency Breakdown</CardTitle><p className="text-sm text-on-surface-variant">Current month by currency</p></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {currencies.map((curr) => (
            <div key={curr.currency} className="flex items-center justify-between p-3 bg-surface-container rounded-lg hover:bg-surface-container-high/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <span className="text-secondary font-bold">{curr.currency}</span>
                </div>
                <div>
                  <p className="font-medium text-on-surface">{curr.currency}</p>
                  <p className="text-sm text-on-surface-variant">{curr.count} transactions</p>
                </div>
              </div>
              <span className="font-mono font-bold text-on-surface">{curr.formatted}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
