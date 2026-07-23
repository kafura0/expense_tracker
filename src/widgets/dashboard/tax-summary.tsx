'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useActiveOrgId } from '@/shared/lib/org-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Receipt } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'

export function TaxSummary() {
  const supabase = createClient()
  const orgId = useActiveOrgId()

  const fetchTaxSummary = async () => {
    if (!orgId) throw new Error('No active organization')
    const now = new Date()
    const start = startOfMonth(now)
    const end = endOfMonth(now)

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount_cents, tax_amount_cents, currency')
      .eq('is_deleted', false)
      .eq('org_id', orgId)
      .eq('is_taxable', true)
      .gte('date', start.toISOString())
      .lte('date', end.toISOString())

    if (error) throw error

    const totalTax = expenses?.reduce((sum, e) => sum + (e.tax_amount_cents || 0), 0) || 0
    const totalAmount = expenses?.reduce((sum, e) => sum + e.amount_cents, 0) || 0
    const taxableExpenses = expenses?.length || 0
    const effectiveTaxRate = totalAmount > 0 ? (totalTax / totalAmount) * 100 : 0

    return { totalTax, totalAmount, taxableExpenses, effectiveTaxRate }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['tax-summary', orgId],
    queryFn: fetchTaxSummary,
    enabled: orgId !== undefined,
  })

  if (orgId === undefined) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader><Skeleton className="h-6 w-40 bg-surface-container-high" /><Skeleton className="h-4 w-48 bg-surface-container-high" /></CardHeader>
        <CardContent><div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-surface-container-high" />)}</div></CardContent>
      </Card>
    )
  }

  if (orgId === null) {
    return <Card className="glass-card border-outline-variant"><CardContent className="p-6 text-center text-on-surface-variant">No organization selected</CardContent></Card>
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader><Skeleton className="h-6 w-40 bg-surface-container-high" /><Skeleton className="h-4 w-48 bg-surface-container-high" /></CardHeader>
        <CardContent><div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-surface-container-high" />)}</div></CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-outline-variant"><CardContent className="p-6 text-center text-destructive">Error loading tax summary</CardContent></Card>
  }

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Receipt className="h-5 w-5 text-primary" /></div>
          <div><CardTitle className="text-on-surface font-headline">Tax Summary</CardTitle><p className="text-sm text-on-surface-variant">Current month breakdown</p></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-surface-container rounded-lg">
            <span className="text-on-surface-variant">Total Tax</span>
            <span className="font-bold text-on-surface text-lg">{formatCurrency(data?.totalTax || 0)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-surface-container rounded-lg">
            <span className="text-on-surface-variant">Taxable Expenses</span>
            <span className="font-mono text-on-surface">{data?.taxableExpenses || 0}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-surface-container rounded-lg">
            <span className="text-on-surface-variant">Effective Tax Rate</span>
            <span className="font-mono text-primary">{data?.effectiveTaxRate?.toFixed(2) || 0}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
