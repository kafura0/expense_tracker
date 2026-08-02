'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { formatMoney } from '@/shared/lib/currency'
import { DashboardHeader } from '@/widgets/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Badge } from '@/shared/ui/badge'
import { startOfMonth } from 'date-fns'
import { Users, Building2, ReceiptText, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export function PlatformAdminDashboard() {
  const supabase = createClient()

  const fetchPlatformStats = async () => {
    const start = startOfMonth(new Date())

    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    const { count: activeOrgs } = await supabase
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: totalExpenses } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('entry_type', 'expense')

    const { data: monthExpenses } = await supabase
      .from('expenses')
      .select('amount_cents')
      .eq('is_deleted', false)
      .eq('entry_type', 'expense')
      .gte('date', start.toISOString())

    const { count: openTickets } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'support')
      .eq('status', 'open')

    const { data: recentTickets } = await supabase
      .from('messages')
      .select('id, subject, status, priority, created_at, organizations(name), profiles(display_name, email)')
      .eq('type', 'support')
      .order('created_at', { ascending: false })
      .limit(5)

    return {
      totalUsers: totalUsers || 0,
      activeOrgs: activeOrgs || 0,
      totalExpenses: totalExpenses || 0,
      monthSpend: monthExpenses?.reduce((s, e) => s + e.amount_cents, 0) || 0,
      openTickets: openTickets || 0,
      recentTickets: (recentTickets || []) as Array<{
        id: string
        subject: string
        status: string
        priority: string
        created_at: string
        organizations: { name?: string } | null
        profiles: { display_name?: string; email?: string } | null
      }>,
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: fetchPlatformStats,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DashboardHeader subtitle="Platform overview" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl bg-muted" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">Error loading platform stats</div>
  }

  const stats = [
    {
      label: 'Total Users',
      value: data?.totalUsers.toLocaleString() || '0',
      icon: Users,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-l-emerald-500',
    },
    {
      label: 'Active Orgs',
      value: data?.activeOrgs.toLocaleString() || '0',
      icon: Building2,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
      border: 'border-l-sky-500',
    },
    {
      label: 'Expenses Tracked',
      value: data?.totalExpenses.toLocaleString() || '0',
      icon: ReceiptText,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-l-purple-500',
    },
    {
      label: 'Open Tickets',
      value: data?.openTickets.toLocaleString() || '0',
      icon: MessageSquare,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-l-amber-500',
    },
  ]

  return (
    <div className="space-y-6">
      <DashboardHeader subtitle="Platform overview" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card
            key={stat.label}
            className={`glass-card border-border border-l-2 ${stat.border} shadow-lg shadow-black/5 animate-fade-in ${
              index === 0 ? '' : index === 1 ? 'delay-75' : index === 2 ? 'delay-150' : 'delay-200'
            }`}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card border-border shadow-lg shadow-black/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-headline">Platform Command</CardTitle>
              <CardDescription>
                {formatMoney(data?.monthSpend || 0, 'USD')} recorded across the platform this month
              </CardDescription>
            </div>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors duration-200"
          >
            Open Admin
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Users', href: '/admin', tab: 'users' },
              { label: 'Clients', href: '/admin', tab: 'clients' },
              { label: 'Invites', href: '/admin', tab: 'invites' },
              { label: 'Messages', href: '/admin', tab: 'messages' },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors duration-200"
              >
                <p className="text-sm font-medium text-foreground">{link.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Manage {link.label.toLowerCase()} →</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {data?.recentTickets && data.recentTickets.length > 0 && (
        <Card className="glass-card border-border shadow-lg shadow-black/5">
          <CardHeader className="pb-2">
            <CardTitle className="font-headline">Recent Support Tickets</CardTitle>
            <CardDescription>Latest open support requests across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ticket.profiles?.display_name || ticket.profiles?.email || 'Unknown user'}
                      {ticket.organizations?.name ? ` · ${ticket.organizations.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ticket.priority !== 'normal' && <Badge variant="destructive">{ticket.priority}</Badge>}
                    <Badge variant="warning">{ticket.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
