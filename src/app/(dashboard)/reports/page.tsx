'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { EmptyState } from '@/shared/ui/empty-state'
import { Skeleton } from '@/shared/ui/skeleton'
import { useToast } from '@/shared/ui/toast'
import { useDashboardScope, applyExpenseScope } from '@/features/dashboard/scope'
import { formatMoney } from '@/shared/lib/currency'
import { generateCSV, downloadCSV } from '@/shared/lib/csv-export'
import { generatePDF } from '@/shared/lib/pdf-export'
import {
  Download,
  TrendingUp,
  Receipt,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

type Range = 'week' | 'month' | 'quarter' | 'year'

interface ReportExpense {
  id: string
  date: string
  amount_cents: number
  currency: string
  category_id: string | null
  notes: string | null
  tax_applicable: boolean
  tax_amount_cents: number | null
  category_name: string
  category_icon: string | null
  category_color: string | null
}

function rangeStart(range: Range): Date {
  const now = new Date()
  switch (range) {
    case 'week':
      now.setDate(now.getDate() - 7)
      break
    case 'month':
      now.setDate(1)
      now.setHours(0, 0, 0, 0)
      break
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3)
      now.setMonth(q * 3, 1)
      now.setHours(0, 0, 0, 0)
      break
    }
    case 'year':
      now.setMonth(0, 1)
      now.setHours(0, 0, 0, 0)
      break
  }
  return now
}

export default function ReportsPage() {
  const { scope, loading: scopeLoading } = useDashboardScope()
  const supabase = createClient()
  const { toast } = useToast()
  const [range, setRange] = useState<Range>('month')
  const [isExporting, setIsExporting] = useState(false)

  const fromIso = rangeStart(range).toISOString()
  const prevFromIso = (() => {
    const start = rangeStart(range)
    const len = new Date().getTime() - start.getTime()
    return new Date(start.getTime() - len).toISOString()
  })()

  const fetchWindow = async (from: string, to: string) => {
    if (!scope) return []
    let query = supabase
      .from('expenses')
      .select('id, date, amount_cents, currency, category_id, notes, tax_applicable, tax_amount_cents, categories(name, icon, color)')
      .eq('is_deleted', false)
      .gte('date', from)
      .lte('date', to)
    query = applyExpenseScope(query, scope)
    const { data, error } = await query
    if (error) throw error
    return (data || []).map((e) => ({
      id: e.id,
      date: e.date,
      amount_cents: e.amount_cents,
      currency: e.currency,
      category_id: e.category_id,
      notes: e.notes,
      tax_applicable: e.tax_applicable,
      tax_amount_cents: e.tax_amount_cents,
      category_name: (e.categories as { name?: string } | null)?.name || 'Uncategorized',
      category_icon: (e.categories as { icon?: string } | null)?.icon || null,
      category_color: (e.categories as { color?: string } | null)?.color || null,
    })) as ReportExpense[]
  }

  const { data, error } = useQuery({
    queryKey: ['reports', range, scope?.orgId, scope?.persona, scope?.userId],
    queryFn: async () => {
      if (!scope) throw new Error('No scope resolved')
      const now = new Date().toISOString()
      const [current, previous, monthly] = await Promise.all([
        fetchWindow(fromIso, now),
        fetchWindow(prevFromIso, fromIso),
        fetchWindow(new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(), now),
      ])
      return { current, previous, monthly }
    },
    enabled: !!scope,
  })

  const stats = (() => {
    const current = data?.current || []
    const previous = data?.previous || []

    const total = current.reduce((a, e) => a + e.amount_cents, 0)
    const prevTotal = previous.reduce((a, e) => a + e.amount_cents, 0)
    const count = current.length

    const start = rangeStart(range).getTime()
    const now = new Date().getTime()
    const days = Math.max(Math.round((now - start) / 86400000), 1)

    const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0

    return {
      total,
      prevTotal,
      count,
      average: count > 0 ? Math.round(total / count) : 0,
      daily: Math.round(total / days),
      change,
    }
  })()

  const monthlyBuckets = (() => {
    const rows = data?.monthly || []
    const buckets: { key: string; label: string; total: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const label = d.toLocaleDateString('en-US', { month: 'short' })
      const total = rows
        .filter((e) => {
          const ed = new Date(e.date)
          return `${ed.getFullYear()}-${ed.getMonth()}` === key
        })
        .reduce((a, e) => a + e.amount_cents, 0)
      buckets.push({ key, label, total })
    }
    return buckets
  })()

  const topCategories = (() => {
    const rows = data?.current || []
    const byCat = new Map<string, { name: string; total: number; color: string | null }>()
    for (const e of rows) {
      const key = e.category_id || 'none'
      const prev = byCat.get(key)
      if (prev) prev.total += e.amount_cents
      else byCat.set(key, { name: e.category_name, total: e.amount_cents, color: e.category_color })
    }
    const list = [...byCat.values()].sort((a, b) => b.total - a.total).slice(0, 6)
    const max = list.length > 0 ? list[0].total : 0
    return list.map((c) => ({ ...c, percentage: max > 0 ? (c.total / max) * 100 : 0 }))
  })()

  const handleExport = async (type: 'csv' | 'pdf') => {
    if (!scope) return
    setIsExporting(true)
    try {
      const expenses = await fetchWindow(fromIso, new Date().toISOString())
      if (expenses.length === 0) {
        toast('No expenses in this range to export', 'warning')
        return
      }
      const exportable = expenses.map((e) => ({
        date: e.date,
        amount_cents: e.amount_cents,
        currency: e.currency,
        category_name: e.category_name,
        notes: e.notes || undefined,
        tax_applicable: e.tax_applicable,
        tax_amount_cents: e.tax_amount_cents || undefined,
      }))
      if (type === 'csv') {
        const csv = generateCSV(exportable)
        const filename = `ledgerly-report-${range}-${new Date().toISOString().split('T')[0]}.csv`
        downloadCSV(csv, filename)
        toast('CSV exported successfully', 'success')
      } else {
        await generatePDF(exportable, 'Ledgerly Report', { from: rangeStart(range), to: new Date() })
        toast('PDF exported successfully', 'success')
      }
    } catch {
      toast('Export failed', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  if (scopeLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (error || !scope) {
    return (
      <div className="space-y-6">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Reports</h1>
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="Could not load reports"
          description={(error as Error)?.message || 'Sign in to view reports.'}
        />
      </div>
    )
  }

  const maxBucket = Math.max(...monthlyBuckets.map((b) => b.total), 1)
  const rangeTotal = (data?.current || []).reduce((a, e) => a + e.amount_cents, 0)

  const summaryCards = [
    {
      label: 'Total Expenses',
      value: formatMoney(stats.total, scope.baseCurrency),
      change: `${stats.change >= 0 ? '+' : ''}${stats.change.toFixed(1)}%`,
      trend: stats.change >= 0 ? 'up' : 'down' as const,
      icon: <TrendingUp className={`h-5 w-5 ${stats.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />,
    },
    {
      label: 'Transactions',
      value: stats.count.toLocaleString(),
      change: 'in range',
      trend: 'up' as const,
      icon: <Receipt className="h-5 w-5 text-primary" />,
    },
    {
      label: 'Average Expense',
      value: formatMoney(stats.average, scope.baseCurrency),
      change: 'per transaction',
      trend: 'up' as const,
      icon: <BarChart3 className="h-5 w-5 text-sky-500" />,
    },
    {
      label: 'Daily Average',
      value: formatMoney(stats.daily, scope.baseCurrency),
      change: `vs ${formatMoney(previousTotal(), scope.baseCurrency)}`,
      trend: 'up' as const,
      icon: <Calendar className="h-5 w-5 text-indigo-500" />,
    },
  ]

  function previousTotal() {
    return data?.previous?.reduce((a, e) => a + e.amount_cents, 0) || 0
  }

  if (rangeTotal === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">Analyze your spending patterns</p>
          </div>
        </div>
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="No expenses in this range"
          description="Change the range or add expenses to see detailed reports and spending insights."
          action={{ label: 'Add Expense', href: '/expenses' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analyze your spending patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border bg-muted/50 p-1">
            {(['week', 'month', 'quarter', 'year'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  range === r
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'CSV'}
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{card.value}</p>
              <div className="mt-1 flex items-center gap-1">
                {card.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-rose-500" />
                )}
                <span
                  className={`text-xs font-medium ${
                    card.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {card.change}
                </span>
                <span className="text-xs text-muted-foreground">vs prev.</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Monthly Overview</CardTitle>
              <Badge variant="secondary">
                <Calendar className="mr-1 h-3 w-3" />
                Last 6 months
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyBuckets.map((bucket) => (
                <div key={bucket.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{bucket.label}</span>
                    <span className="flex items-center gap-1 text-muted-foreground tabular-nums">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      {formatMoney(bucket.total, scope.baseCurrency)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-rose-500/80 transition-all duration-500"
                      style={{ width: `${(bucket.total / maxBucket) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Categories</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categorized expenses in this range.</p>
            ) : (
              <div className="space-y-4">
                {topCategories.map((cat) => (
                  <div key={cat.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color || '#34d399' }}
                        />
                        <span>{cat.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">{formatMoney(cat.total, scope.baseCurrency)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.color || '#34d399' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
