'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { applyExpenseScope, type DashboardScope } from '@/features/dashboard/scope'
import { formatMoney } from '@/shared/lib/currency'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { startOfMonth, endOfMonth } from 'date-fns'
import { Trophy } from 'lucide-react'

interface MemberSpend {
  userId: string
  name: string
  total: number
  count: number
}

export function TeamSpendLeaderboard({ scope }: { scope: DashboardScope }) {
  const supabase = createClient()

  const fetchLeaderboard = async () => {
    const now = new Date()
    const start = startOfMonth(now)
    const end = endOfMonth(now)

    let expenseQuery = supabase
      .from('expenses')
      .select('amount_cents, user_id, profiles(display_name)')
      .eq('is_deleted', false)
      .gte('date', start.toISOString())
      .lte('date', end.toISOString())
    expenseQuery = applyExpenseScope(expenseQuery, scope)
    const { data: expenses, error: expenseError } = await expenseQuery
    if (expenseError) throw expenseError

    const byUser = expenses?.reduce((acc, e) => {
      if (!acc[e.user_id]) {
        const profile = e.profiles as unknown as { display_name?: string } | null
        acc[e.user_id] = { userId: e.user_id, name: profile?.display_name || 'Team member', total: 0, count: 0 }
      }
      acc[e.user_id].total += e.amount_cents
      acc[e.user_id].count += 1
      return acc
    }, {} as Record<string, MemberSpend>) || {}

    return Object.values(byUser).sort((a, b) => b.total - a.total)
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['team-leaderboard', scope],
    queryFn: fetchLeaderboard,
  })

  if (isLoading) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 bg-muted rounded-md" />
          <Skeleton className="h-4 w-48 bg-muted rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28 bg-muted rounded-md" />
                  <Skeleton className="h-3 w-20 bg-muted rounded-md" />
                </div>
                <Skeleton className="h-5 w-20 bg-muted rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <Card className="glass-card border-border shadow-lg shadow-black/5"><CardContent className="p-6 text-center text-destructive">Error loading leaderboard</CardContent></Card>
  }

  if (!data || data.length === 0) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle>Team Spend</CardTitle>
          <CardDescription>Spending by team member this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="p-4 rounded-2xl bg-muted/50">
              <Trophy className="h-8 w-8" />
            </div>
            <p className="font-medium">No expenses this month</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const rankStyles = ['text-amber-400', 'text-slate-300', 'text-orange-400']

  return (
    <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in delay-200">
      <CardHeader className="pb-2">
        <CardTitle>Team Spend</CardTitle>
        <CardDescription>Spending by team member this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.slice(0, 6).map((member, index) => {
            const pct = data[0]?.total ? (member.total / data[0].total) * 100 : 0
            return (
              <div key={member.userId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors duration-200">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  index < 3
                    ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 ring-1 ring-amber-500/20'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground truncate">{member.name}</p>
                    <span className="font-mono font-semibold text-foreground text-sm tabular-nums">
                      {formatMoney(member.total, scope.baseCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                    <span className={`text-[11px] tabular-nums ${index < 3 ? rankStyles[index] : 'text-muted-foreground'}`}>
                      #{index + 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{member.count} expense{member.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
