'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useActiveOrgId } from '@/shared/lib/org-helpers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Badge } from '@/shared/ui/badge'
import { format } from 'date-fns'
import { ArrowRight, ReceiptText } from 'lucide-react'
import Link from 'next/link'

export function RecentActivity() {
  const supabase = createClient()
  const orgId = useActiveOrgId()

  const fetchRecentExpenses = async () => {
    if (!orgId) throw new Error('No active organization')

    const { data, error } = await supabase
      .from('expenses')
      .select(`id, title, amount_cents, currency, date, category_id, categories (name, icon)`)
      .eq('is_deleted', false)
      .eq('org_id', orgId)
      .order('date', { ascending: false })
      .limit(10)

    if (error) throw error
    return data?.map(expense => ({
      ...expense,
      category_name: (expense.categories as { name?: string } | null)?.name || 'Unknown',
      category_icon: (expense.categories as { icon?: string } | null)?.icon || '📦',
    }))
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['recent-expenses', orgId],
    queryFn: fetchRecentExpenses,
    enabled: orgId !== undefined,
  })

  if (orgId === undefined || orgId === null) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-surface-container-high rounded-md" />
          <Skeleton className="h-4 w-32 bg-surface-container-high rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-xl bg-surface-container-high" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-surface-container-high rounded-md" />
                  <Skeleton className="h-3 w-20 bg-surface-container-high rounded-md" />
                </div>
                <Skeleton className="h-6 w-20 bg-surface-container-high rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-surface-container-high rounded-md" />
          <Skeleton className="h-4 w-32 bg-surface-container-high rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-xl bg-surface-container-high" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-surface-container-high rounded-md" />
                  <Skeleton className="h-3 w-20 bg-surface-container-high rounded-md" />
                </div>
                <Skeleton className="h-6 w-20 bg-surface-container-high rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-outline-variant shadow-lg shadow-black/5"><CardContent className="p-6 text-center text-destructive">Error loading recent activity</CardContent></Card>
  }

  if (!data || data.length === 0) {
    return (
      <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="p-4 rounded-2xl bg-muted/50">
              <ReceiptText className="h-8 w-8" />
            </div>
            <p className="font-medium">No expenses yet</p>
            <p className="text-xs">Start tracking to see your recent activity here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-outline-variant shadow-lg shadow-black/5 animate-fade-in delay-200">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest expenses</CardDescription>
        </div>
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors duration-200"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
          {data.map((expense, index) => (
            <div
              key={expense.id}
              className={`flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 cursor-default animate-fade-in ${
                index === 0 ? '' : index === 1 ? 'delay-75' : index === 2 ? 'delay-150' : index <= 4 ? 'delay-200' : 'delay-300'
              }`}
            >
              <div className="h-11 w-11 rounded-xl bg-muted/50 flex items-center justify-center text-lg shrink-0">
                {expense.category_icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{expense.title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(expense.date), 'MMM d, yyyy')}</p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">{expense.category_name}</Badge>
                <span className="font-mono text-foreground font-semibold text-sm tabular-nums">{formatCurrency(expense.amount_cents, expense.currency)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
