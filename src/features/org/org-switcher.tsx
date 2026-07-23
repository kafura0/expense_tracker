'use client'

import { useOrg } from '@/shared/lib/org-provider'
import { cn } from '@/shared/lib/utils'
import { ChevronDown, Building2, Shield, Users, Eye } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import type { LucideIcon } from 'lucide-react'

const roleIcons: Record<string, LucideIcon> = {
  super_admin: Shield,
  manager: Users,
  client: Eye,
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  client: 'Client',
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

  // If user only has one org, no need for switcher
  if (orgs.length === 1 && !activeOrg) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm bg-surface-container hover:bg-surface-container-high transition-colors text-left"
      >
        <Building2 className="h-4 w-4 shrink-0 text-on-surface-variant" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-on-surface truncate">
            {activeOrg?.org_name || 'Select Organization'}
          </p>
          {activeOrg && (
            <p className="text-xs text-on-surface-variant truncate">
              {roleLabels[activeOrg.role] || activeOrg.role}
            </p>
          )}
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 shrink-0 text-on-surface-variant transition-transform',
          open && 'rotate-180'
        )} />
      </button>

      {open && orgs.length > 1 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface rounded-lg shadow-lg border border-outline-variant z-50 max-h-64 overflow-y-auto">
          <p className="px-3 py-2 text-xs font-medium text-on-surface-variant border-b border-outline-variant">
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
                  'flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-surface-container-high transition-colors',
                  isActive && 'bg-primary/10'
                )}
              >
                <Icon className={cn(
                  'h-4 w-4 shrink-0',
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium truncate',
                    isActive ? 'text-primary' : 'text-on-surface'
                  )}>
                    {org.org_name}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">
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
