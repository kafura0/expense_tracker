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
  replyToMessage,
  closeMessage,
  toggleOrgStatus,
} from '@/features/admin/actions'
import {
  Users, Building2, Megaphone, MessageSquare, Shield, RefreshCw,
  Mail, X, Send, ChevronDown, ChevronUp, AlertTriangle, Search, Filter,
  ReceiptText, Wallet,
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

function UsersTab() {
  const [searchQuery, setSearchQuery] = useState('')
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

  const toggleMutation = useMutation({
    mutationFn: async ({ orgId, status }: { orgId: string; status: 'active' | 'suspended' }) => {
      const result = await toggleOrgStatus(orgId, status)
      if ('error' in result && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast('Organization updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const clients = useMemo(() => (data as { clients?: Array<Record<string, unknown>> })?.clients || [], [data])

  const allUsers = useMemo(() => {
    const users: Array<{
      userId: string
      name: string
      email: string
      orgName: string
      orgSlug: string
      role: string
      orgStatus: string
      orgId: string
    }> = []
    clients.forEach((org) => {
      const members = (org.org_members as Array<{
        user_id: string
        profiles?: { display_name?: string; email?: string }
      }>) || []
      members.forEach((m) => {
        users.push({
          userId: m.user_id,
          name: m.profiles?.display_name || 'Unknown',
          email: m.profiles?.email || '',
          orgName: org.name as string,
          orgSlug: org.slug as string,
          role: 'Member',
          orgStatus: org.status as string,
          orgId: org.id as string,
        })
      })
    })
    return users.filter((u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.orgName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [clients, searchQuery])

  const totalUsers = allUsers.length
  const activeOrgs = clients.filter(c => c.status === 'active').length

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalUsers}</p>
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
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suspended Orgs</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{clients.length - activeOrgs}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="font-headline">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {allUsers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No users found"
              description={searchQuery ? 'No users match your search criteria' : 'No users have been onboarded yet'}
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20">
                      <th className="text-left py-3 px-3 text-muted-foreground font-medium">User</th>
                      <th className="text-left py-3 px-3 text-muted-foreground font-medium">Organization</th>
                      <th className="text-left py-3 px-3 text-muted-foreground font-medium">Role</th>
                      <th className="text-left py-3 px-3 text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-3 px-3 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user) => (
                      <tr key={`${user.userId}-${user.orgId}`} className="border-b border-border/10 hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-primary">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <p className="text-muted-foreground">{user.orgName}</p>
                          <p className="text-xs text-muted-foreground">{user.orgSlug}</p>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="secondary">{user.role}</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={user.orgStatus === 'active' ? 'success' : user.orgStatus === 'suspended' ? 'destructive' : 'outline'}>
                            {user.orgStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {user.orgStatus === 'active' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleMutation.mutate({ orgId: user.orgId, status: 'suspended' })}
                              className="text-red-400 border-red-800 hover:bg-red-900/20"
                            >
                              Suspend Org
                            </Button>
                          ) : user.orgStatus === 'suspended' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleMutation.mutate({ orgId: user.orgId, status: 'active' })}
                              className="text-green-400 border-green-800 hover:bg-green-900/20"
                            >
                              Activate Org
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3">
                {allUsers.map((user) => (
                  <div key={`${user.userId}-${user.orgId}`} className="p-4 bg-muted rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant={user.orgStatus === 'active' ? 'success' : 'destructive'}>
                        {user.orgStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{user.orgName}</span>
                        <Badge variant="secondary" className="text-xs">{user.role}</Badge>
                      </div>
                      {user.orgStatus === 'active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleMutation.mutate({ orgId: user.orgId, status: 'suspended' })}
                          className="text-red-400 border-red-800 hover:bg-red-900/20 h-7 text-xs"
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleMutation.mutate({ orgId: user.orgId, status: 'active' })}
                          className="text-green-400 border-green-800 hover:bg-green-900/20 h-7 text-xs"
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ClientsTab() {
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
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

  const toggleMutation = useMutation({
    mutationFn: async ({ orgId, status }: { orgId: string; status: 'active' | 'suspended' }) => {
      const result = await toggleOrgStatus(orgId, status)
      if ('error' in result && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast('Organization updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const clients = (data as { clients?: Array<Record<string, unknown>> })?.clients || []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Clients</p>
            <p className="text-2xl font-bold text-foreground mt-1">{clients.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-green-400 mt-1">
              {clients.filter(c => c.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Members</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {clients.reduce((acc, c) => {
                const members = (c.org_members as Array<unknown>) || []
                return acc + members.length
              }, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

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
                const subs = (org.subscriptions as Array<{ plan?: { name?: string; price_monthly?: number } }>) || []
                const members = (org.org_members as Array<{ user_id: string; profiles?: { display_name?: string; email?: string } }>) || []
                const planName = subs[0]?.plan?.name || 'No plan'
                const planPrice = subs[0]?.plan?.price_monthly
                const status = org.status as string
                const isExpanded = expandedOrg === (org.id as string)

                return (
                  <div key={org.id as string} className="rounded-xl border border-border/20 overflow-hidden">
                    <div
                      className="p-4 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => setExpandedOrg(isExpanded ? null : (org.id as string))}
                    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{org.name as string}</p>
                            <p className="text-xs text-muted-foreground">{org.slug as string}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={status === 'active' ? 'success' : status === 'suspended' ? 'destructive' : 'outline'}>
                            {status}
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
                            <p className="text-sm font-medium text-foreground">{planName}</p>
                            {planPrice != null && (
                              <p className="text-xs text-muted-foreground">${Number(planPrice).toFixed(2)}/mo</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Members</p>
                            <p className="text-sm font-medium text-foreground">{members.length}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-sm font-medium text-foreground">
                              {new Date(org.created_at as string).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Status</p>
                            <Badge variant={status === 'active' ? 'success' : 'destructive'}>
                              {status}
                            </Badge>
                          </div>
                        </div>
                        {members.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Members</p>
                            <div className="space-y-2">
                              {members.map((member) => (
                                <div key={member.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-primary">
                                      {member.profiles?.display_name?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate">
                                      {member.profiles?.display_name || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {member.profiles?.email || ''}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
                          {status === 'active' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleMutation.mutate({ orgId: org.id as string, status: 'suspended' })
                              }}
                              disabled={toggleMutation.isPending}
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
                                toggleMutation.mutate({ orgId: org.id as string, status: 'active' })
                              }}
                              disabled={toggleMutation.isPending}
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
    </div>
  )
}

function AnnouncementsTab() {
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'messages'],
    queryFn: async () => {
      const result = await getAdminMessages({ type: 'announcement' })
      if ('error' in result && result.error) throw new Error(result.error)
      return result
    },
  })

  const messages = (data as { messages?: Array<Record<string, unknown>> })?.messages || []

  const handleCreateAnnouncement = () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      toast('Please fill in both title and body', 'error')
      return
    }
    toast('Announcement created successfully', 'success')
    setAnnouncementTitle('')
    setAnnouncementBody('')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
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
              <CardDescription>Send an announcement to all users</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <Input
              placeholder="Announcement title"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Message</label>
            <textarea
              placeholder="Write your announcement here..."
              value={announcementBody}
              onChange={(e) => setAnnouncementBody(e.target.value)}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground transition-all duration-200 hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring placeholder:text-muted-foreground resize-none"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCreateAnnouncement}
              disabled={!announcementTitle.trim() || !announcementBody.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Announcement
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
                const status = msg.status as string
                return (
                  <div key={msg.id as string} className="p-4 bg-muted rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">announcement</Badge>
                        <Badge variant={status === 'open' ? 'warning' : status === 'replied' ? 'success' : 'outline'}>
                          {status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(msg.created_at as string).toLocaleDateString()}
                      </span>
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
            const profile = msg.profiles as { display_name?: string; email?: string } | undefined
            const org = msg.organizations as { name?: string } | undefined
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
                          {profile?.display_name || profile?.email || 'Unknown user'}
                          {org?.name ? ` \u2014 ${org.name}` : ''}
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
  const [role, setRole] = useState<'client' | 'manager'>('client')
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
      const result = await createInviteAction(email, role)
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
          <CardDescription>Invite a client or manager to your organization</CardDescription>
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
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'client' | 'manager')}
              className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground"
            >
              <option value="client">Client</option>
              <option value="manager">Manager</option>
            </select>
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
              {invites.map((invite: { id: string; email: string; role: string; status: string }) => (
                <div key={invite.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">{invite.role} · {invite.status}</p>
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
