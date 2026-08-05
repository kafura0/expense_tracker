'use client'

import { useMemo } from 'react'
import type { DashboardScope } from '@/features/dashboard/scope'
import { useDashboardData, useCurrentMonthExpenses } from '@/features/dashboard/use-dashboard-data'
import { formatMoney } from '@/shared/lib/currency'
import { sumInBaseCurrency } from '@/entities/expense/totals'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Receipt } from 'lucide-react'

export function TaxSummary({ scope }: { scope: DashboardScope }) {
  const { data: query, isLoading, error } = useDashboardData(scope)
  const currentMonth = useCurrentMonthExpenses(query?.expenses)

  const data = useMemo(() => {
    if (!query) return undefined

    const taxable = currentMonth.filter((e) => e.is_taxable)

    const totalTax = sumInBaseCurrency(
      taxable.map((e) => ({ amount_cents: e.tax_amount_cents || 0, currency: e.currency })),
      scope.baseCurrency,
      query.rates
    )
    const totalAmount = sumInBaseCurrency(taxable, scope.baseCurrency, query.rates)
    const taxableExpenses = taxable.length
    const effectiveTaxRate = totalAmount > 0 ? (totalTax / totalAmount) * 100 : 0

    return { totalTax, totalAmount, taxableExpenses, effectiveTaxRate }
  }, [query, currentMonth, scope.baseCurrency])

  if (isLoading) {
    return (
      <Card className="glass-card border-border">
        <CardHeader><Skeleton className="h-6 w-40 bg-muted" /><Skeleton className="h-4 w-48 bg-muted" /></CardHeader>
        <CardContent><div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-muted" />)}</div></CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-border"><CardContent className="p-6 text-center text-destructive">Error loading tax summary</CardContent></Card>
  }

  return (
    <Card className="glass-card border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Receipt className="h-5 w-5 text-primary" /></div>
          <div><CardTitle className="text-foreground font-headline">Tax Summary</CardTitle><p className="text-sm text-muted-foreground">Current month breakdown</p></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-muted-foreground">Total Tax</span>
            <span className="font-bold text-foreground text-lg">{formatMoney(data?.totalTax || 0, scope.baseCurrency)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-muted-foreground">Taxable Expenses</span>
            <span className="font-mono text-foreground">{data?.taxableExpenses || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-muted-foreground">Effective Tax Rate</span>
            <span className="font-mono text-primary">{data?.effectiveTaxRate?.toFixed(2) || 0}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
