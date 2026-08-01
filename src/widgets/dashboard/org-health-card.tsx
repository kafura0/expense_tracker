'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import type { DashboardScope } from '@/features/dashboard/scope'
import { formatMoney } from '@/shared/lib/currency'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Badge } from '@/shared/ui/badge'
import { startOfMonth } from 'date-fns'
import { Building2, CreditCard, Users, ReceiptText } from 'lucide-react'

export function OrgHealthCard({ scope, orgName }: { scope: DashboardScope; orgName?: string }) {
  const supabase = createClient()

  const fetchHealth = async () => {
    const orgId = scope.orgId
    if (!orgId) return null
    const now = new Date()
    const start = startOfMonth(now)

    const { data: org } = await supabase
      .from('organizations')
      .select('name, status, created_at')
      .eq('id', orgId)
      .maybeSingle()

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status, current_period_end, plans(name, price_monthly_cents, max_members)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: members } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)

    const { count: monthExpenses } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .gte('date', start.toISOString())

    return {
      orgName: (org as { name?: string } | null)?.name || orgName || 'Organization',
      orgStatus: (org as { status?: string } | null)?.status || 'active',
      planName: (subscription?.plans as unknown as { name?: string; price_monthly_cents?: number; max_members?: number } | null)?.name || 'Free',
      planPrice: (subscription?.plans as unknown as { price_monthly_cents?: number } | null)?.price_monthly_cents || 0,
      maxMembers: (subscription?.plans as unknown as { max_members?: number } | null)?.max_members ?? 1,
      subStatus: subscription?.status || 'active',
      periodEnd: subscription?.current_period_end || null,
      memberCount: members?.length || 0,
      monthExpenses: monthExpenses || 0,
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['org-health', scope],
    queryFn: fetchHealth,
    enabled: Boolean(scope.orgId),
  })

  if (isLoading) {
    return (
      <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48 bg-muted rounded-md" />
          <Skeleton className="h-4 w-56 bg-muted rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return <Card className="glass-card border-border shadow-lg shadow-black/5"><CardContent className="p-6 text-center text-destructive">Error loading organization health</CardContent></Card>
  }

  const daysLeft = data.periodEnd
    ? Math.max(0, Math.ceil((new Date(data.periodEnd).getTime() - new Date().getTime()) / 86_400_000))
    : null

  const stats = [
    {
      label: 'Members',
      value: `${data.memberCount}/${data.maxMembers === -1 ? '∞' : data.maxMembers}`,
      icon: Users,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'This Month',
      value: `${data.monthExpenses} expenses`,
      icon: ReceiptText,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
    },
    {
      label: 'Plan',
      value: `${data.planName}${data.planPrice > 0 ? ` · ${formatMoney(data.planPrice, 'USD')}/mo` : ' · Free'}`,
      icon: CreditCard,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Billing',
      value: daysLeft != null ? `${daysLeft} days left` : '—',
      icon: Building2,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ]

  return (
    <Card className="glass-card border-border shadow-lg shadow-black/5 animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{data.orgName}</CardTitle>
            <CardDescription>Organization health &amp; subscription</CardDescription>
          </div>
          <Badge variant={data.orgStatus === 'active' ? 'success' : data.orgStatus === 'suspended' ? 'destructive' : 'outline'}>
            {data.orgStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl bg-muted/50">
              <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-2`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="font-bold text-foreground text-sm mt-0.5 truncate">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
