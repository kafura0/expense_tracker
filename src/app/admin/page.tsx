'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { useToast } from '@/shared/ui/toast'
import {
  getAdminClients,
  getAdminAuditLogs,
  getAdminMessages,
  replyToMessage,
  closeMessage,
  getAdminPlans,
  updatePlan,
  toggleOrgStatus,
} from '@/features/admin/actions'
import {
  Building2, AlertTriangle, MessageSquare, CreditCard,
  RefreshCw, Shield, Mail, X, Send,
} from 'lucide-react'

type Tab = 'clients' | 'errors' | 'messages' | 'plans'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('clients')
  const queryClient = useQueryClient()

  const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: 'clients', label: 'Clients', icon: Building2 },
    { id: 'errors', label: 'Error Logs', icon: AlertTriangle },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'plans', label: 'Plans', icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-on-surface-variant">Manage clients, errors, messages, and plans</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin'] })}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-container p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'errors' && <ErrorLogsTab />}
      {activeTab === 'messages' && <MessagesTab />}
      {activeTab === 'plans' && <PlansTab />}
    </div>
  )
}

function ClientsTab() {
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

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader>
        <CardTitle className="font-headline">Onboarded Clients</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-on-surface-variant text-center py-8">Loading...</p>
        ) : clients.length === 0 ? (
          <p className="text-on-surface-variant text-center py-8">No clients yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="text-left py-3 px-2 text-on-surface-variant font-medium">Organization</th>
                  <th className="text-left py-3 px-2 text-on-surface-variant font-medium">Plan</th>
                  <th className="text-left py-3 px-2 text-on-surface-variant font-medium">Members</th>
                  <th className="text-left py-3 px-2 text-on-surface-variant font-medium">Status</th>
                  <th className="text-left py-3 px-2 text-on-surface-variant font-medium">Created</th>
                  <th className="text-right py-3 px-2 text-on-surface-variant font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((org: Record<string, unknown>) => {
                  const subs = (org.subscriptions as Array<{ plan?: { name?: string } }>) || []
                  const members = (org.org_members as Array<{ user_id: string; profiles?: { display_name?: string; email?: string } }>) || []
                  const planName = subs[0]?.plan?.name || 'No plan'
                  const status = org.status as string
                  return (
                    <tr key={org.id as string} className="border-b border-outline-variant/10 hover:bg-surface-container/50">
                      <td className="py-3 px-2">
                        <p className="font-medium text-on-surface">{org.name as string}</p>
                        <p className="text-xs text-on-surface-variant">{org.slug as string}</p>
                      </td>
                      <td className="py-3 px-2 text-on-surface-variant">{planName}</td>
                      <td className="py-3 px-2 text-on-surface-variant">{members.length}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          status === 'active' ? 'bg-green-900/30 text-green-400'
                            : status === 'suspended' ? 'bg-red-900/30 text-red-400'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-on-surface-variant text-xs">
                        {new Date(org.created_at as string).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleMutation.mutate({ orgId: org.id as string, status: 'suspended' })}
                            className="text-red-400 border-red-800 hover:bg-red-900/20"
                          >
                            Suspend
                          </Button>
                        ) : status === 'suspended' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleMutation.mutate({ orgId: org.id as string, status: 'active' })}
                            className="text-green-400 border-green-800 hover:bg-green-900/20"
                          >
                            Activate
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ErrorLogsTab() {
  const [actionFilter, setActionFilter] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'errors', actionFilter],
    queryFn: async () => {
      const result = await getAdminAuditLogs({ action: actionFilter || undefined, limit: 100 })
      if ('error' in result && result.error) throw new Error(result.error)
      return result
    },
  })

  const logs = (data as { logs?: Array<Record<string, unknown>> })?.logs || []

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-headline">Audit / Error Logs</CardTitle>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm text-on-surface"
          >
            <option value="">All actions</option>
            <option value="error">Errors only</option>
            <option value="login">Login</option>
            <option value="expense.create">Expense created</option>
            <option value="expense.update">Expense updated</option>
            <option value="expense.delete">Expense deleted</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-on-surface-variant text-center py-8">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-on-surface-variant text-center py-8">No logs found</p>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-container">
                <tr className="border-b border-outline-variant/20">
                  <th className="text-left py-2 px-2 text-on-surface-variant font-medium">Time</th>
                  <th className="text-left py-2 px-2 text-on-surface-variant font-medium">Action</th>
                  <th className="text-left py-2 px-2 text-on-surface-variant font-medium">Entity</th>
                  <th className="text-left py-2 px-2 text-on-surface-variant font-medium">User</th>
                  <th className="text-left py-2 px-2 text-on-surface-variant font-medium">IP</th>
                  <th className="text-left py-2 px-2 text-on-surface-variant font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: Record<string, unknown>) => {
                  const profile = log.profiles as { display_name?: string; email?: string } | undefined
                  return (
                    <tr key={log.id as string} className="border-b border-outline-variant/10 hover:bg-surface-container/50">
                      <td className="py-2 px-2 text-xs text-on-surface-variant whitespace-nowrap">
                        {new Date(log.created_at as string).toLocaleString()}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                          (log.action as string)?.includes('error')
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {log.action as string}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-on-surface-variant text-xs">
                        {log.entity_type as string}
                      </td>
                      <td className="py-2 px-2 text-on-surface-variant text-xs">
                        {profile?.display_name || profile?.email || (log.user_id as string)?.slice(0, 8) || '—'}
                      </td>
                      <td className="py-2 px-2 text-on-surface-variant text-xs font-mono">
                        {log.ip_address as string || '—'}
                      </td>
                      <td className="py-2 px-2 text-on-surface-variant text-xs max-w-[200px] truncate">
                        {log.new_value ? JSON.stringify(log.new_value).slice(0, 100) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
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
      toast('Reply sent', 'success')
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

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader>
        <div className="flex items-center gap-3 flex-wrap">
          <CardTitle className="font-headline">User Messages</CardTitle>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm text-on-surface"
          >
            <option value="">All types</option>
            <option value="support">Support tickets</option>
            <option value="announcement">Announcements</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-sm text-on-surface"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-on-surface-variant text-center py-8">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-on-surface-variant text-center py-8">No messages</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg: Record<string, unknown>) => {
              const profile = msg.profiles as { display_name?: string; email?: string } | undefined
              const org = msg.organizations as { name?: string } | undefined
              const status = msg.status as string
              const priority = msg.priority as string
              return (
                <div key={msg.id as string} className="p-4 bg-surface-container rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          msg.type === 'support' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'
                        }`}>
                          {msg.type as string}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          status === 'open' ? 'bg-yellow-900/30 text-yellow-400'
                            : status === 'replied' ? 'bg-green-900/30 text-green-400'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {status}
                        </span>
                        {priority !== 'normal' && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-400">
                            {priority}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-on-surface mt-1">{msg.subject as string}</h4>
                      <p className="text-sm text-on-surface-variant">
                        {profile?.display_name || profile?.email || 'Unknown user'}
                        {org?.name ? ` — ${org.name}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-on-surface-variant whitespace-nowrap">
                      {new Date(msg.created_at as string).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-3 whitespace-pre-wrap">{msg.body as string}</p>

                  {typeof msg.admin_reply === 'string' && msg.admin_reply && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg mb-3">
                      <p className="text-xs text-primary font-medium mb-1">Admin Reply:</p>
                      <p className="text-sm text-on-surface">{msg.admin_reply as string}</p>
                    </div>
                  )}

                  {replyingTo === (msg.id as string) ? (
                    <div className="flex gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        className="flex-1 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => replyMutation.mutate({ messageId: msg.id as string, reply: replyText })}
                        disabled={!replyText.trim() || replyMutation.isPending}
                        className="bg-primary text-on-primary"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setReplyingTo(null); setReplyText('') }}>
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
                          className="text-on-surface-variant"
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PlansTab() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: async () => {
      const result = await getAdminPlans()
      if ('error' in result && result.error) throw new Error(result.error)
      return result
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ planId, updates }: { planId: string; updates: { name?: string; price_monthly?: number } }) => {
      const result = await updatePlan(planId, updates)
      if ('error' in result && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast('Plan updated', 'success')
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] })
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const plans = (data as { plans?: Array<Record<string, unknown>> })?.plans || []

  return (
    <Card className="glass-card border-outline-variant">
      <CardHeader>
        <CardTitle className="font-headline">Subscription Plans</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-on-surface-variant text-center py-8">Loading...</p>
        ) : plans.length === 0 ? (
          <p className="text-on-surface-variant text-center py-8">No plans configured</p>
        ) : (
          <div className="space-y-3">
            {plans.map((plan: Record<string, unknown>) => {
              const isEditing = editingId === (plan.id as string)
              const price = plan.price_monthly as number
              return (
                <div key={plan.id as string} className="p-4 bg-surface-container rounded-lg">
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface w-48"
                        placeholder="Plan name"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface w-32"
                        placeholder="Price"
                      />
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate({
                          planId: plan.id as string,
                          updates: { name: editName, price_monthly: parseFloat(editPrice) || 0 },
                        })}
                        disabled={updateMutation.isPending}
                        className="bg-primary text-on-primary"
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-on-surface">{plan.name as string}</p>
                        <p className="text-sm text-on-surface-variant">
                          ${typeof price === 'number' ? price.toFixed(2) : '0.00'}/mo &middot; {plan.slug as string}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(plan.id as string)
                          setEditName(plan.name as string)
                          setEditPrice(String(plan.price_monthly ?? 0))
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
