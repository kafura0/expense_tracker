'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import type { DashboardScope } from '@/features/dashboard/scope'
import { Megaphone } from 'lucide-react'
import { format } from 'date-fns'

export function AnnouncementBanner({ scope }: { scope: DashboardScope }) {
  const supabase = createClient()

  const fetchAnnouncements = async () => {
    if (!scope.orgId) return []
    const { data, error } = await supabase
      .from('messages')
      .select('id, subject, body, created_at')
      .eq('org_id', scope.orgId)
      .eq('type', 'announcement')
      .order('created_at', { ascending: false })
      .limit(2)
    if (error) throw error
    return data || []
  }

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', scope],
    queryFn: fetchAnnouncements,
    enabled: Boolean(scope.orgId),
  })

  if (isLoading || !data || data.length === 0) return null

  return (
    <div className="space-y-2">
      {data.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 animate-fade-in"
        >
          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground truncate">{a.subject}</p>
              <span className="text-[11px] text-muted-foreground shrink-0">{format(new Date(a.created_at), 'MMM d')}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{a.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
