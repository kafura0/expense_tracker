'use client'

/**
 * admin/page.tsx
 *
 * Super Admin Dashboard — the command center for Ledgerly's multi-tenant platform.
 *
 * ARCHITECTURE:
 * This page uses SERVER ACTIONS for all write operations (approve, reject, suspend, activate).
 * It does NOT use the client-side Supabase client for admin operations.
 *
 * WHY SERVER ACTIONS?
 * Admin operations require the service role key, which is ONLY available server-side.
 * The previous implementation tried to use supabase.auth.admin.* from the browser,
 * which would fail because the browser client uses the anon key (not service role).
 *
 * SECURITY FLOW:
 * 1. Page loads → calls getAdminDashboardData() server action
 * 2. Server action verifies the user is a super_admin via org_members check
 * 3. Server action fetches all data with full admin privileges
 * 4. Client renders the data — can only READ, all writes go through server actions
 * 5. Each server action re-verifies super_admin status before executing
 *
 * DATA:
 * - Client requests: People who want access to the platform
 * - Organizations: All tenant organizations with their plans and member counts
 * - Managers: Users with manager role (can be assigned to client orgs)
 * - Plans: Subscription tiers (Free, Pro, Enterprise)
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { useToast } from '@/shared/ui/toast'
import {
  approveClientRequest,
  rejectClientRequest,
  toggleOrgStatus,
  getAdminDashboardData,
} from '@/features/auth/actions'
import {
  Users, CheckCircle, XCircle, Clock, Building2,
  CreditCard, RefreshCw
} from 'lucide-react'

/** Shape of a client access request. */
interface ClientRequest {
  id: string
  name: string
  email: string
  business_name: string | null
  phone: string | null
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

/** Shape of an organization in the admin view. */
interface Org {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
  subscriptions?: { plan: { name: string } }[]
  org_members?: { user_id: string }[]
}

/** Shape of a manager for assignment. */
interface OrgMember {
  id: string
  user_id: string
  org_id: string
  role: string
  profiles?: { display_name: string; avatar_url: string | null }
}

export default function AdminDashboard() {
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null)
  const [managerId, setManagerId] = useState('')
  const [planSlug, setPlanSlug] = useState('free')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  /**
   * Fetch all admin data via a single server action.
   * The server action verifies super_admin status before returning any data.
   * This replaces the previous pattern of multiple client-side Supabase queries.
   */
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const result = await getAdminDashboardData()
      if ('error' in result && result.error) throw new Error(result.error)
      return result as {
        requests: ClientRequest[]
        orgs: Org[]
        managers: OrgMember[]
        plans: Array<{ slug: string; name: string }>
      }
    },
  })

  const requests = data?.requests || []
  const orgs = data?.orgs || []
  const managers = data?.managers || []
  const plans = data?.plans || []

  /**
   * Approve a client request via server action.
   *
   * The server action handles the entire multi-step process:
   * 1. Creates the user account (with service role key — server-side only)
   * 2. Creates the organization
   * 3. Assigns the client and manager as org members
   * 4. Creates the subscription
   * 5. Updates existing user data to belong to the new org
   * 6. Sends the invitation email
   *
   * If any step fails, the server action returns an error — the client
   * does not need to handle partial failures.
   */
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, managerId, planSlug }: { requestId: string; managerId: string; planSlug: string }) => {
      const result = await approveClientRequest(requestId, managerId, planSlug)
      if (result && 'error' in result && result.error) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      toast('Client approved and account created', 'success')
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      setSelectedRequest(null)
    },
    onError: (error: Error) => {
      toast(error.message, 'error')
    },
  })

  /**
   * Reject a client request via server action.
   * Updates the request status to 'rejected' and records the reviewer.
   */
  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const result = await rejectClientRequest(requestId)
      if (result && 'error' in result && result.error) {
        throw new Error(result.error)
      }
    },
    onSuccess: () => {
      toast('Request rejected', 'default')
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
    onError: (error: Error) => {
      toast(error.message, 'error')
    },
  })

  /**
   * Toggle org status (suspend/activate) via server action.
   * Only super admins can perform this action.
   */
  const toggleOrgStatusMutation = useMutation({
    mutationFn: async ({ orgId, newStatus }: { orgId: string; newStatus: 'active' | 'suspended' }) => {
      const result = await toggleOrgStatus(orgId, newStatus)
      if (result && 'error' in result && result.error) {
        throw new Error(result.error)
      }
    },
    onSuccess: () => {
      toast('Organization updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
    onError: (error: Error) => {
      toast(error.message, 'error')
    },
  })

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const reviewedRequests = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Admin Dashboard</h1>
          <p className="text-on-surface-variant">Manage clients, organizations, and access</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin'] })}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card border-outline-variant">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-xs text-on-surface-variant">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-outline-variant">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orgs.length}</p>
                <p className="text-xs text-on-surface-variant">Organizations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-outline-variant">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orgs.reduce((sum, o) => sum + (o.org_members?.length || 0), 0)}
                </p>
                <p className="text-xs text-on-surface-variant">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-outline-variant">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orgs.filter(o => o.status === 'active').length}
                </p>
                <p className="text-xs text-on-surface-variant">Active Orgs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <CardTitle className="font-headline">Pending Access Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-on-surface-variant">Loading...</p>
          ) : pendingRequests.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-surface-container rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{request.name}</p>
                    <p className="text-sm text-on-surface-variant">{request.email}</p>
                    {request.business_name && (
                      <p className="text-xs text-on-surface-variant">{request.business_name}</p>
                    )}
                    {request.message && (
                      <p className="text-xs text-on-surface-variant mt-1 italic">&ldquo;{request.message}&rdquo;</p>
                    )}
                    <p className="text-xs text-on-surface-variant mt-1">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate(request.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved/Rejected */}
      {reviewedRequests.length > 0 && (
        <Card className="glass-card border-outline-variant">
          <CardHeader>
            <CardTitle className="font-headline">Reviewed Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reviewedRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-surface-container rounded-lg text-sm">
                  <div>
                    <span className="font-medium">{request.name}</span>
                    <span className="text-on-surface-variant ml-2">{request.email}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    request.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations */}
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <CardTitle className="font-headline">Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-on-surface-variant">Loading...</p>
          ) : orgs.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4">No organizations yet</p>
          ) : (
            <div className="space-y-3">
              {orgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-4 bg-surface-container rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-on-surface-variant">
                      {org.subscriptions?.[0]?.plan?.name || 'No plan'} &middot;{' '}
                      {org.org_members?.length || 0} members
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Created {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      org.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : org.status === 'suspended'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {org.status}
                    </span>
                    {org.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleOrgStatusMutation.mutate({ orgId: org.id, newStatus: 'suspended' })}
                        className="text-red-600 border-red-300"
                      >
                        Suspend
                      </Button>
                    ) : org.status === 'suspended' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleOrgStatusMutation.mutate({ orgId: org.id, newStatus: 'active' })}
                        className="text-green-600 border-green-300"
                      >
                        Activate
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Approve {selectedRequest.name}</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will create an account for <strong>{selectedRequest.email}</strong> and send them an invitation email.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={planSlug}
                  onChange={(e) => setPlanSlug(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {plans.map((p: { slug: string; name: string }) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Manager</label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">No manager assigned</option>
                  {managers.map((m: OrgMember) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.display_name || m.user_id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => approveMutation.mutate({
                  requestId: selectedRequest.id,
                  managerId,
                  planSlug,
                })}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {approveMutation.isPending ? 'Creating...' : 'Confirm & Create Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
