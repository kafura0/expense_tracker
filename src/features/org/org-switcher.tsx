'use client'

import { useOrg } from '@/shared/lib/org-provider'
import { cn } from '@/shared/lib/utils'
import { ChevronDown, Building2, Shield, Users } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import type { LucideIcon } from 'lucide-react'

const roleIcons: Record<string, LucideIcon> = {
  super_admin: Shield,
  org_admin: Users,
  member: Users,
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Org Admin',
  member: 'Org Member',
}

export function OrgSwitcher() {
  const { orgs, activeOrg, switchOrg, loading } = useOrg()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading || orgs.length === 0) return null

  // Never render for platform super admins (FR-4, UX-DR9) — they are pinned
  // to the /admin console and should never see an org switcher.
  if (activeOrg?.role === 'super_admin') return null

  // Hidden at ≤1 membership — nothing to switch between (FR-4, UX-DR9).
  if (orgs.length <= 1) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted transition-colors text-left"
      >
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {activeOrg?.org_name || 'Select Organization'}
          </p>
          {activeOrg && (
            <p className="text-xs text-muted-foreground truncate">
              {roleLabels[activeOrg.role] || activeOrg.role}
            </p>
          )}
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
          open && 'rotate-180'
        )} />
      </button>

      {open && orgs.length > 1 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-card rounded-lg shadow-lg border border-border z-50 max-h-64 overflow-y-auto">
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
            Switch Organization
          </p>
          {orgs.map((org) => {
            const Icon = roleIcons[org.role] || Building2
            const isActive = org.org_id === activeOrg?.org_id
            return (
              <button
                key={org.org_id}
                onClick={() => {
                  switchOrg(org.org_id)
                  setOpen(false)
                }}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors',
                  isActive && 'bg-primary/10'
                )}
              >
                <Icon className={cn(
                  'h-4 w-4 shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium truncate',
                    isActive ? 'text-primary' : 'text-foreground'
                  )}>
                    {org.org_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {roleLabels[org.role] || org.role}
                  </p>
                </div>
                {isActive && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
