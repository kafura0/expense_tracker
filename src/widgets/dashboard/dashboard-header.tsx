'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { format } from 'date-fns'
import { Sparkles, CalendarDays } from 'lucide-react'

interface DashboardHeaderProps {
  subtitle: string
}

export function DashboardHeader({ subtitle }: DashboardHeaderProps) {
  const supabase = createClient()

  const fetchName = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
  }

  const { data: name } = useQuery({
    queryKey: ['dashboard-greeting'],
    queryFn: fetchName,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-secondary/10 ring-1 ring-primary/20 shadow-glow">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-headline tracking-tight">
            {greeting}, <span className="text-primary">{name}</span>
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
