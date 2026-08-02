'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { applyExpenseScope, type DashboardScope } from '@/features/dashboard/scope'
import { formatMoney } from '@/shared/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Globe } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'

export function CurrencySummary({ scope }: { scope: DashboardScope }) {
  const supabase = createClient()

  const fetchCurrencySummary = async () => {
    const now = new Date()
    const start = startOfMonth(now)
    const end = endOfMonth(now)

    let query = supabase
      .from('expenses')
      .select('amount_cents, currency')
      .eq('is_deleted', false)
      .eq('entry_type', 'expense')
      .gte('date', start.toISOString())
      .lte('date', end.toISOString())
    query = applyExpenseScope(query, scope)
    const { data: expenses, error } = await query

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
        formatted: formatMoney(data.total, currency),
      }))
      .sort((a, b) => b.total - a.total)
  }

  const { data: currencies, isLoading, error } = useQuery({
    queryKey: ['currency-summary', scope],
    queryFn: fetchCurrencySummary,
  })

  if (isLoading) {
    return (
      <Card className="glass-card border-border">
        <CardHeader><Skeleton className="h-6 w-40 bg-muted" /><Skeleton className="h-4 w-48 bg-muted" /></CardHeader>
        <CardContent><div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-muted" />)}</div></CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-border"><CardContent className="p-6 text-center text-destructive">Error loading currency summary</CardContent></Card>
  }

  if (!currencies || currencies.length === 0) {
    return (
      <Card className="glass-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10"><Globe className="h-5 w-5 text-secondary" /></div>
            <div><CardTitle className="text-foreground font-headline">Currency Breakdown</CardTitle><p className="text-sm text-muted-foreground">Current month by currency</p></div>
          </div>
        </CardHeader>
        <CardContent><div className="h-[100px] flex items-center justify-center text-muted-foreground">No expenses this month</div></CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/10"><Globe className="h-5 w-5 text-secondary" /></div>
          <div><CardTitle className="text-foreground font-headline">Currency Breakdown</CardTitle><p className="text-sm text-muted-foreground">Current month by currency</p></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {currencies.map((curr) => (
            <div key={curr.currency} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <span className="text-secondary font-bold">{curr.currency}</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{curr.currency}</p>
                  <p className="text-sm text-muted-foreground">{curr.count} transactions</p>
                </div>
              </div>
              <span className="font-mono font-bold text-foreground">{curr.formatted}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
