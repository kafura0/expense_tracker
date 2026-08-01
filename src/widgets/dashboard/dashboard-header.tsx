'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { format } from 'date-fns'

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
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground font-headline tracking-tight">
          {greeting}, {name}
        </h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <p className="text-sm text-muted-foreground capitalize">{format(new Date(), 'EEEE, MMMM d')}</p>
    </div>
  )
}
