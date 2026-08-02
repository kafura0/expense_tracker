'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import type { DashboardScope } from '@/features/dashboard/scope'
import { Megaphone, Gift, Wrench } from 'lucide-react'
import { format } from 'date-fns'

const CATEGORY_META = {
  announcement: {
    icon: Megaphone,
    label: 'Announcement',
    classes: 'border-primary/20 bg-primary/5',
    iconBg: 'bg-primary/10',
    text: 'text-primary',
  },
  offer: {
    icon: Gift,
    label: 'Offer',
    classes: 'border-amber-500/20 bg-amber-500/5',
    iconBg: 'bg-amber-500/10',
    text: 'text-amber-400',
  },
  maintenance: {
    icon: Wrench,
    label: 'Maintenance',
    classes: 'border-sky-500/20 bg-sky-500/5',
    iconBg: 'bg-sky-500/10',
    text: 'text-sky-400',
  },
} as const

type Category = keyof typeof CATEGORY_META

export function AnnouncementBanner({ scope }: { scope: DashboardScope }) {
  const supabase = createClient()

  const fetchAnnouncements = async () => {
    // RLS ("Users can read platform announcements") scopes the result to
    // announcements targeted at the current user's account type.
    const { data, error } = await supabase
      .from('messages')
      .select('id, subject, body, created_at, category')
      .eq('type', 'announcement')
      .is('org_id', null)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(2)
    if (error) throw error
    return data || []
  }

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', scope.userId],
    queryFn: fetchAnnouncements,
  })

  if (isLoading || !data || data.length === 0) return null

  return (
    <div className="space-y-2">
      {data.map((a) => {
        const meta = CATEGORY_META[(a.category as Category) in CATEGORY_META ? (a.category as Category) : 'announcement']
        const Icon = meta.icon
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 animate-fade-in ${meta.classes}`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${meta.iconBg}`}>
              <Icon className={`h-4 w-4 ${meta.text}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wider shrink-0 ${meta.text}`}>
                  {meta.label}
                </span>
                <p className="text-sm font-semibold text-foreground truncate">{a.subject}</p>
                <span className="text-[11px] text-muted-foreground shrink-0 ml-auto">
                  {format(new Date(a.created_at), 'MMM d')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{a.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
