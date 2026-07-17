'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { format } from 'date-fns'
import { Pencil, Trash2, ArrowRight } from 'lucide-react'

export function RecentActivity() {
  const supabase = createClient()

  const fetchRecentExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        id,
        title,
        amount_cents,
        currency,
        date,
        category_id,
        categories (name, icon)
      `)
      .eq('is_deleted', false)
      .order('date', { ascending: false })
      .limit(10)

    if (error) throw error

    return data?.map(expense => ({
      ...expense,
      category_name: (expense.categories as any)?.name || 'Unknown',
      category_icon: (expense.categories as any)?.icon || '📦',
    }))
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['recent-expenses'],
    queryFn: fetchRecentExpenses,
  })

  const formatCurrency = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100)
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-surface-container-high" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full bg-surface-container-high" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2 bg-surface-container-high" />
                  <Skeleton className="h-3 w-20 bg-surface-container-high" />
                </div>
                <Skeleton className="h-6 w-20 bg-surface-container-high" />
              </div>
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
          Error loading recent activity
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <CardTitle className="text-on-surface font-headline">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-on-surface-variant">
            No recent expenses
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-on-surface font-headline">Recent Activity</CardTitle>
          <p className="text-sm text-on-surface-variant">Last 10 expenses</p>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          View All <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((expense) => (
            <div 
              key={expense.id} 
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                {expense.category_icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-on-surface font-medium truncate">
                  {expense.title}
                </p>
                <p className="text-sm text-on-surface-variant">
                  {format(new Date(expense.date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-outline-variant text-on-surface-variant">
                  {expense.category_name}
                </Badge>
                <span className="font-mono text-on-surface font-bold">
                  {formatCurrency(expense.amount_cents, expense.currency)}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-on-surface-variant hover:text-primary">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-on-surface-variant hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}