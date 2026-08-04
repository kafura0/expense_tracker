'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSettingsContext } from '@/features/settings/actions'
import { MySettingsTab } from '@/widgets/settings/my-settings-tab'
import { MembersTab } from '@/widgets/settings/members-tab'
import { OrganizationTab } from '@/widgets/settings/organization-tab'
import { Settings, Users, Building2 } from 'lucide-react'

type TabId = 'profile' | 'members' | 'organization'

const TABS: { id: TabId; label: string; icon: typeof Settings; orgOnly?: boolean }[] = [
  { id: 'profile', label: 'My Settings', icon: Settings },
  { id: 'members', label: 'Members', icon: Users, orgOnly: true },
  { id: 'organization', label: 'Organization', icon: Building2, orgOnly: true },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const { data: ctx } = useQuery({
    queryKey: ['settings-context'],
    queryFn: getSettingsContext,
  })

  const visibleTabs = TABS.filter(
    (tab) => !tab.orgOnly || (tab.id === 'members' ? ctx?.isOrgAdmin : ctx?.hasOrg)
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="font-headline text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and organization preferences</p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-card p-1.5">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-primary/15 text-primary shadow-sm ring-1 ring-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'members' && ctx?.isOrgAdmin ? (
        <MembersTab />
      ) : activeTab === 'organization' ? (
        <OrganizationTab isOrgAdmin={Boolean(ctx?.isOrgAdmin)} />
      ) : (
        <MySettingsTab />
      )}
    </div>
  )
}
