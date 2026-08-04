'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { useOrg } from '@/shared/lib/org-provider'
import { format } from 'date-fns'
import { Sparkles, CalendarDays, User, Users, ShieldCheck } from 'lucide-react'

interface DashboardHeaderProps {
  subtitle: string
}

export function DashboardHeader({ subtitle }: DashboardHeaderProps) {
  const supabase = createClient()
  const { activeOrg, isSolo } = useOrg()

  const fetchName = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
  }

  const { data: name } = useQuery({
    queryKey: ['dashboard-greeting'],
    queryFn: fetchName,
  })

  const roleLabel = activeOrg?.role === 'super_admin'
    ? 'Super Admin'
    : activeOrg?.role === 'org_admin'
      ? 'Org Admin'
      : isSolo
        ? 'Solo'
        : 'Org Member'

  const RoleIcon = activeOrg?.role === 'super_admin'
    ? ShieldCheck
    : activeOrg?.role === 'org_admin'
      ? Users
      : isSolo
        ? User
        : Users

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-secondary/10 ring-1 ring-primary/20 shadow-glow">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl md:text-3xl font-bold text-foreground font-headline tracking-tight">
            {greeting}, <span className="text-primary">{name}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
              <RoleIcon className="h-3 w-3" />
              {roleLabel}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-border bg-card/70 text-sm text-muted-foreground w-fit backdrop-blur-sm">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span className="capitalize font-medium">{format(new Date(), 'EEEE, MMMM d')}</span>
      </div>
    </div>
  )
}
