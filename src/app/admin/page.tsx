'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { EmptyState } from '@/shared/ui/empty-state'
import { Skeleton } from '@/shared/ui/skeleton'
import { useToast } from '@/shared/ui/toast'
import {
  getAdminClients,
  getAdminKpis,
  getAdminMessages,
  getAdminUsers,
  getAdminOrganizations,
  replyToMessage,
  closeMessage,
  toggleOrgStatus,
  setUserStatus,
  createAnnouncementAction,
  deleteAnnouncement,
} from '@/features/admin/actions'
import {
  Users, Building2, Megaphone, MessageSquare, Shield, RefreshCw,
  Mail, X, Send, ChevronDown, ChevronUp, AlertTriangle, Search, Filter,
  ReceiptText, Wallet, UserRound, Gift, Wrench, Trash2,
} from 'lucide-react'
import { formatMoneyCompact } from '@/shared/lib/currency'

type Tab = 'users' | 'clients' | 'invites' | 'announcements' | 'messages'

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'clients', label: 'Clients', icon: Building2 },
  { id: 'invites', label: 'Invites', icon: Send },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
]

const CATEGORY_META: Record<string, { label: string; icon: typeof Megaphone; badge: 'info' | 'warning' | 'outline' }> = {
  announcement: { label: 'Announcement', icon: Megaphone, badge: 'info' },
  offer: { label: 'Offer', icon: Gift, badge: 'warning' },
  maintenance: { label: 'Maintenance', icon: Wrench, badge: 'outline' },
}

const AUDIENCE_LABELS: Record<string, string> = {
  everyone: 'Everyone',
  orgs: 'All organizations',
  solo: 'Solo users',
  org: 'Specific organization',
}

type UserKind = 'solo' | 'org' | 'super_admin'

interface AdminUser {
  userId: string
  email: string
  displayName: string
  createdAt: string | null
  isSuspended: boolean
  kind: UserKind
  primaryRole: string
  orgs: Array<{ orgId: string; name: string; slug: string; status: string; role: string }>
}

interface AdminOrg {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
  members: Array<{ user_id: string; role: string; display_name: string; email: string }>
  plan: string | null
  plan_price: number | null
}

interface AdminSolo {
  user_id: string
  display_name: string
  email: string
  is_suspended: boolean
  created_at: string
}

function PlatformKpis() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kpis'],
    queryFn: async () => {
      const result = await getAdminKpis()
      if ('error' in result && result.error) throw new Error(result.error)
      return (result as { kpis?: Record<string, number> }).kpis || {}
    },
  })

  const cards = [
    { label: 'Total Users', value: data?.users ?? 0, icon: Users, tint: 'text-primary bg-primary/10' },
    { label: 'Active Orgs', value: data?.organizations ?? 0, icon: Building2, tint: 'text-indigo-400 bg-indigo-500/10' },
    { label: 'Expenses Tracked', value: data?.expenses ?? 0, icon: ReceiptText, tint: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Spend This Month', value: formatMoneyCompact(data?.month_spend ?? 0), icon: Wallet, tint: 'text-amber-400 bg-amber-500/10' },
    { label: 'Open Tickets', value: data?.open_tickets ?? 0, icon: MessageSquare, tint: 'text-rose-400 bg-rose-500/10' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {isLoading
        ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        : cards.map((card) => (
            <Card key={card.label} className="glass-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.tint}`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">{card.value}</p>
              </CardContent>
            </Card>
          ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const queryClient = useQueryClient()

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground font-headline flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Manage clients, users, announcements, and messages</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin'] })}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <PlatformKpis />

      <div className="bg-muted rounded-xl p-1.5 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap justify-center ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted-high'
            }`}
          >
            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-primary' : ''}`} />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'invites' && <InvitesTab />}
      {activeTab === 'announcements' && <AnnouncementsTab />}
      {activeTab === 'messages' && <MessagesTab />}
    </div>
  )
}

const KIND_META: Record<UserKind, { label: string; badge: 'secondary' | 'info' | 'warning' }> = {
  solo: { label: 'Solo', badge: 'secondary' },
  org: { label: 'Org', badge: 'info' },
  super_admin: { label: 'Super Admin', badge: 'warning' },
}

function UserRow({ user, onToggle }: { user: AdminUser; onToggle: (userId: string, suspended: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  const meta = KIND_META[user.kind]
  return (
    <tr className="border-b border-border/10 hover:bg-muted/50 transition-colors">
      <td className="py-3 px-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{user.displayName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-medium text-foreground flex items-center gap-2">
              {user.displayName}
              {user.isSuspended && (
                <span className="text-[10px] uppercase tracking-wider text-red-400 border border-red-800 rounded-full px-1.5 py-0.5">
                  Suspended
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-3">
        <Badge variant={meta.badge}>{meta.label}</Badge>
      </td>
      <td className="py-3 px-3">
        {user.orgs.length > 0 ? (
          <div className="space-y-1">
            {user.orgs.map((org) => (
              <div key={org.orgId} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{org.name}</span>
                <Badge variant={org.status === 'active' ? 'success' : 'destructive'} className="text-[10px]">
                  {org.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No organization</span>
        )}
      </td>
      <td className="py-3 px-3">
        <Badge variant="secondary">{user.primaryRole}</Badge>
      </td>
      <td className="py-3 px-3 text-right">
        {user.kind === 'super_admin' ? (
          <span className="text-xs text-muted-foreground">Protected</span>
        ) : user.isSuspended ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                onToggle(user.userId, false)
              } finally {
                setBusy(false)
              }
            }}
            className="text-green-400 border-green-800 hover:bg-green-900/20"
          >
            Activate
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                onToggle(user.userId, true)
              } finally {
                setBusy(false)
              }
            }}
            className="text-red-400 border-red-800 hover:bg-red-900/20"
          >
            Suspend
          </Button>
        )}
      </td>
    </tr>
  )
}

function UsersTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<UserKind | ''>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'suspended' | 'active'>('all')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const result = await getAdminUsers()
      if ('error' in result && result.error) throw new Error(result.error)
      return result
    },
  })

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      const result = await setUserStatus(userId, suspended)
      if ('error' in result && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast('Account updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'kpis'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const users = useMemo(() => (data as { users?: AdminUser[] })?.users || [], [data])
  const activeOrgs = (data as { activeOrgs?: number })?.activeOrgs || 0
  const suspendedCount = (data as { suspendedUsers?: number })?.suspendedUsers || 0

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return users.filter((u) => {
      if (kindFilter && u.kind !== kindFilter) return false
      if (statusFilter === 'suspended' && !u.isSuspended) return false
      if (statusFilter === 'active' && u.isSuspended) return false
      if (
        q &&
        !u.displayName.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q) &&
        !u.orgs.some((o) => o.name.toLowerCase().includes(q))
      ) {
        return false
      }
      return true
    })
  }, [users, searchQuery, kindFilter, statusFilter])

  const kindChips: { id: UserKind | ''; label: string }[] = [
    { id: '', label: 'All' },
    { id: 'solo', label: 'Solo' },
    { id: 'org', label: 'Org' },
    { id: 'super_admin', label: 'Super Admin' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Accounts</p>
            <p className="text-2xl font-bold text-foreground mt-1">{users.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Orgs</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{activeOrgs}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suspended Accounts</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{suspendedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {kindChips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setKindFilter(chip.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    kindFilter === chip.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="h-8 rounded-lg border border-border bg-muted px-2 text-xs text-foreground"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="font-headline">All Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No accounts found"
              description={searchQuery || kindFilter || statusFilter !== 'all' ? 'No accounts match the current filters' : 'No accounts have been created yet'}
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20">
                      <th className="text-left py-3 px-3 text-muted-foreground font-medium">Account</th>
                      <th className="text-left py-3 px-3 text-muted-foreground font-medium">Type</th>
                      <th className="text-left py-3 px-3 text-muted-foreground font-medium">Organization</th>
                      <th className="text-left py-3 px-3 text-muted-foreground font-medium">Role</th>
                      <th className="text-right py-3 px-3 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <UserRow
                        key={user.userId}
                        user={user}
                        onToggle={(userId, suspended) => suspendMutation.mutate({ userId, suspended })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3">
                {filtered.map((user) => {
                  const meta = KIND_META[user.kind]
                  return (
                    <div key={user.userId} className="p-4 bg-muted rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">{user.displayName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{user.displayName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge variant={meta.badge}>{meta.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {user.orgs.length > 0 ? user.orgs.map((o) => o.name).join(', ') : 'No organization'}
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{user.primaryRole}</Badge>
                        {user.kind === 'super_admin' ? (
                          <span className="text-xs text-muted-foreground">Protected</span>
                        ) : user.isSuspended ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => suspendMutation.mutate({ userId: user.userId, suspended: false })}
                            disabled={suspendMutation.isPending}
                            className="text-green-400 border-green-800 hover:bg-green-900/20 h-7 text-xs"
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => suspendMutation.mutate({ userId: user.userId, suspended: true })}
                            disabled={suspendMutation.isPending}
                            className="text-red-400 border-red-800 hover:bg-red-900/20 h-7 text-xs"
                          >
                            Suspend
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SoloRow({ solo, onToggle }: { solo: AdminSolo; onToggle: (userId: string, suspended: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <UserRound className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{solo.display_name}</p>
        <p className="text-xs text-muted-foreground truncate">{solo.email}</p>
      </div>
      <Badge variant={solo.is_suspended ? 'destructive' : 'success'}>
        {solo.is_suspended ? 'Suspended' : 'Active'}
      </Badge>
      {solo.is_suspended ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onToggle(solo.user_id, false)}
          className="text-green-400 border-green-800 hover:bg-green-900/20"
        >
          Activate
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onToggle(solo.user_id, true)}
          className="text-red-400 border-red-800 hover:bg-red-900/20"
        >
          Suspend
        </Button>
      )}
    </div>
  )
}

function ClientsTab() {
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [view, setView] = useState<'orgs' | 'solo'>('orgs')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'clients'],
    queryFn: async () => {
      const result = await getAdminClients()
      if ('error' in result && result.error) throw new Error(result.error)
      return result
    },
  })

  const orgMutation = useMutation({
    mutationFn: async ({ orgId, status }: { orgId: string; status: 'active' | 'suspended' }) => {
      const result = await toggleOrgStatus(orgId, status)
      if ('error' in result && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast('Organization updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const soloMutation = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      const result = await setUserStatus(userId, suspended)
      if ('error' in result && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast('Solo account updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const clients = useMemo(() => (data as { clients?: AdminOrg[] })?.clients || [], [data])
  const soloAccounts = useMemo(() => (data as { soloAccounts?: AdminSolo[] })?.soloAccounts || [], [data])
  const activeOrgs = clients.filter((c) => c.status === 'active').length

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="bg-muted rounded-xl p-1 flex gap-1">
          <button
            onClick={() => setView('orgs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'orgs' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Organizations
          </button>
          <button
            onClick={() => setView('solo')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'solo' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Solo Users
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {view === 'orgs' ? `${clients.length} orgs · ${activeOrgs} active` : `${soloAccounts.length} solo accounts`}
        </span>
      </div>

      {view === 'orgs' ? (
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="font-headline">Client Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-8 w-8" />}
                title="No clients yet"
                description="Organizations will appear here once they have been onboarded"
              />
            ) : (
              <div className="space-y-3">
                {clients.map((org) => {
                  const isExpanded = expandedOrg === org.id
                  return (
                    <div key={org.id} className="rounded-xl border border-border/20 overflow-hidden">
                      <div
                        className="p-4 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{org.name}</p>
                              <p className="text-xs text-muted-foreground">{org.slug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={org.status === 'active' ? 'success' : org.status === 'suspended' ? 'destructive' : 'outline'}>
                              {org.status}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="p-4 border-t border-border/20 space-y-4 bg-card/50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Plan</p>
                              <p className="text-sm font-medium text-foreground">{org.plan || 'No plan'}</p>
                              {org.plan_price != null && (
                                <p className="text-xs text-muted-foreground">${Number(org.plan_price).toFixed(2)}/mo</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Members</p>
                              <p className="text-sm font-medium text-foreground">{org.members.length}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Created</p>
                              <p className="text-sm font-medium text-foreground">
                                {new Date(org.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Status</p>
                              <Badge variant={org.status === 'active' ? 'success' : 'destructive'}>
                                {org.status}
                              </Badge>
                            </div>
                          </div>
                          {org.members.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Members</p>
                              <div className="space-y-2">
                                {org.members.map((member) => (
                                  <div key={member.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <span className="text-xs font-bold text-primary">
                                        {member.display_name.charAt(0)?.toUpperCase() || '?'}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-foreground truncate">{member.display_name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px]">{member.role}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
                            {org.status === 'active' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  orgMutation.mutate({ orgId: org.id, status: 'suspended' })
                                }}
                                disabled={orgMutation.isPending}
                                className="text-red-400 border-red-800 hover:bg-red-900/20"
                              >
                                Suspend Organization
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  orgMutation.mutate({ orgId: org.id, status: 'active' })
                                }}
                                disabled={orgMutation.isPending}
                                className="text-green-400 border-green-800 hover:bg-green-900/20"
                              >
                                Activate Organization
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="font-headline">Solo Users</CardTitle>
            <CardDescription>Independent accounts with no organization</CardDescription>
          </CardHeader>
          <CardContent>
            {soloAccounts.length === 0 ? (
              <EmptyState
                icon={<UserRound className="h-8 w-8" />}
                title="No solo accounts"
                description="Solo users who sign up independently will appear here"
              />
            ) : (
              <div className="space-y-2">
                {soloAccounts.map((solo) => (
                  <SoloRow
                    key={solo.user_id}
                    solo={solo}
                    onToggle={(userId, suspended) => soloMutation.mutate({ userId, suspended })}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AnnouncementsTab() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<'announcement' | 'offer' | 'maintenance'>('announcement')
  const [audience, setAudience] = useState<'everyone' | 'orgs' | 'solo' | 'org'>('everyone')
  const [targetOrgId, setTargetOrgId] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'messages', 'announcement'],
    queryFn: async () => {
      const result = await getAdminMessages({ type: 'announcement', limit: 50 })
      if ('error' in result && result.error) throw new Error(result.error)
      return result
    },
  })

  const orgsQuery = useQuery({
    queryKey: ['admin', 'orgs'],
    queryFn: async () => {
      const result = await getAdminOrganizations()
      if ('error' in result && result.error) throw new Error(result.error)
      return (result as { orgs?: Array<{ id: string; name: string; slug: string; status: string }> }).orgs || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await createAnnouncementAction({
        title,
        body,
        category,
        audience,
        targetOrgId: audience === 'org' ? targetOrgId : null,
      })
      if ('error' in result && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast('Announcement sent', 'success')
      setTitle('')
      setBody('')
      setCategory('announcement')
      setAudience('everyone')
      setTargetOrgId('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'messages', 'announcement'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const result = await deleteAnnouncement(messageId)
      if ('error' in result && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast('Announcement deleted', 'success')
      queryClient.invalidateQueries({ queryKey: ['admin', 'messages', 'announcement'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const messages = (data as { messages?: Array<Record<string, unknown>> })?.messages || []
  const orgs = orgsQuery.data || []

  const audienceLabel = (msg: Record<string, unknown>) => {
    const a = (msg.audience as string) || 'everyone'
    if (a === 'org') return String(msg.org_name || 'Specific organization')
    return AUDIENCE_LABELS[a] || a
  }

  const canSubmit =
    title.trim().length > 0 && body.trim().length > 0 && (audience !== 'org' || targetOrgId.length > 0)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-headline">Create Announcement</CardTitle>
              <CardDescription>Broadcast a message to a targeted audience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input
                placeholder="Announcement title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Type</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="flex w-full h-10 rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="announcement">Announcement</option>
                <option value="offer">Offer</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as typeof audience)}
                className="flex w-full h-10 rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="everyone">Everyone</option>
                <option value="orgs">All organizations</option>
                <option value="solo">Solo users</option>
                <option value="org">One organization</option>
              </select>
            </div>
            {audience === 'org' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Organization</label>
                <select
                  value={targetOrgId}
                  onChange={(e) => setTargetOrgId(e.target.value)}
                  className="flex w-full h-10 rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <option value="">Select an organization...</option>
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Message</label>
            <textarea
              placeholder="Write your announcement here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={4000}
              className="flex w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground transition-all duration-200 hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring placeholder:text-muted-foreground resize-none"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Sending...' : 'Send Announcement'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="font-headline">Existing Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="h-8 w-8" />}
              title="No announcements yet"
              description="Create your first announcement using the form above"
            />
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const cat = (msg.category as string) || 'announcement'
                const meta = CATEGORY_META[cat] || CATEGORY_META.announcement
                const CatIcon = meta.icon
                const status = msg.status as string
                return (
                  <div key={msg.id as string} className="p-4 bg-muted rounded-xl">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={meta.badge} className="capitalize flex items-center gap-1">
                          <CatIcon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                        <Badge variant="outline">{audienceLabel(msg)}</Badge>
                        <Badge variant={status === 'open' ? 'warning' : 'outline'}>{status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(msg.created_at as string).toLocaleDateString()}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(msg.id as string)}
                          disabled={deleteMutation.isPending}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                          title="Delete announcement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <h4 className="font-medium text-foreground">{msg.subject as string}</h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{msg.body as string}</p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MessagesTab() {
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'messages', typeFilter, statusFilter],
    queryFn: async () => {
      const result = await getAdminMessages({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      })
      if ('error' in result && result.error) throw new Error(result.error)
      return result
    },
  })

  const replyMutation = useMutation({
    mutationFn: async ({ messageId, reply }: { messageId: string; reply: string }) => {
      const result = await replyToMessage(messageId, reply)
      if ('error' in result && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast('Reply sent successfully', 'success')
      setReplyingTo(null)
      setReplyText('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const closeMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const result = await closeMessage(messageId)
      if ('error' in result && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast('Message closed', 'success')
      queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const messages = (data as { messages?: Array<Record<string, unknown>> })?.messages || []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
            >
              <option value="">All types</option>
              <option value="support">Support tickets</option>
              <option value="announcement">Announcements</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="replied">Replied</option>
              <option value="closed">Closed</option>
            </select>
            <span className="text-xs text-muted-foreground ml-auto">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {messages.length === 0 ? (
        <Card className="glass-card border-border">
          <CardContent>
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title="No messages found"
              description={typeFilter || statusFilter ? 'No messages match the current filters' : 'No user messages have been received yet'}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg: Record<string, unknown>) => {
            const status = msg.status as string
            const priority = msg.priority as string

            return (
              <Card key={msg.id as string} className="glass-card border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={msg.type === 'support' ? 'info' : 'outline'}>
                          {msg.type as string}
                        </Badge>
                        <Badge variant={status === 'open' ? 'warning' : status === 'replied' ? 'success' : 'outline'}>
                          {status}
                        </Badge>
                        {priority && priority !== 'normal' && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {priority}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{msg.subject as string}</h4>
                        <p className="text-sm text-muted-foreground">
                          {String(msg.sender_name || msg.sender_email || 'Unknown user')}
                          {msg.org_name ? ` \u2014 ${String(msg.org_name)}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(msg.created_at as string).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.body as string}</p>

                  {typeof msg.admin_reply === 'string' && msg.admin_reply && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-xs text-primary font-medium mb-1">Admin Reply</p>
                      <p className="text-sm text-foreground">{msg.admin_reply as string}</p>
                    </div>
                  )}

                  {replyingTo === (msg.id as string) ? (
                    <div className="flex gap-2">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        autoFocus
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => replyMutation.mutate({ messageId: msg.id as string, reply: replyText })}
                        disabled={!replyText.trim() || replyMutation.isPending}
                        className="bg-primary text-primary-foreground"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setReplyingTo(null); setReplyText('') }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReplyingTo(msg.id as string)}
                          className="text-primary border-primary/30"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Reply
                        </Button>
                      )}
                      {status !== 'closed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => closeMutation.mutate(msg.id as string)}
                          disabled={closeMutation.isPending}
                          className="text-muted-foreground"
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InvitesTab() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { data: invitesData, refetch } = useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: async () => {
      const { listInvitesAction } = await import('@/features/invites/actions')
      return listInvitesAction()
    },
  })

  const handleSendInvite = async () => {
    if (!email) return
    setSending(true)
    setMessage(null)
    try {
      const { createInviteAction } = await import('@/features/invites/actions')
      const result = await createInviteAction(email)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Invite sent successfully' })
        setEmail('')
        refetch()
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send invite' })
    } finally {
      setSending(false)
    }
  }

  const handleRevoke = async (inviteId: string) => {
    try {
      const { revokeInviteAction } = await import('@/features/invites/actions')
      await revokeInviteAction(inviteId)
      refetch()
    } catch {
      // silently fail
    }
  }

  const invites = invitesData?.data || []

  return (
    <div className="space-y-6">
      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="font-headline">Send Invite</CardTitle>
          <CardDescription>Invite a new member to the organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSendInvite} disabled={sending || !email}>
              {sending ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
          {message && (
            <div className={`mt-3 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="font-headline">Pending Invites</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No invites sent yet</p>
          ) : (
            <div className="space-y-2">
              {invites.map((invite: { id: string; email: string; status: string }) => (
                <div key={invite.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">Org Member · {invite.status}</p>
                  </div>
                  {invite.status === 'pending' && (
                    <Button variant="ghost" size="sm" onClick={() => handleRevoke(invite.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
