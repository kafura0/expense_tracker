'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getRoster,
  removeMember,
  updateMemberRole,
  type RosterMember,
} from '@/features/members/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { useToast } from '@/shared/ui/toast'
import { EmptyState } from '@/shared/ui/empty-state'
import { ErrorState } from '@/shared/ui/error-state'
import { InviteForm } from '@/features/invites/invite-form'
import {
  listInvitesAction,
  revokeInviteAction,
  resendInviteAction,
  type InviteListItem,
} from '@/features/invites/actions'
import {
  Users,
  MoreVertical,
  ShieldPlus,
  ShieldMinus,
  UserMinus,
  Crown,
  ShieldCheck,
  Mail,
  RefreshCw,
  Ban,
  Clock,
} from 'lucide-react'

const ROLE_LABEL: Record<RosterMember['role'], string> = {
  super_admin: 'Platform Admin',
  org_admin: 'Org Admin',
  member: 'Member',
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function isExpired(invite: Pick<InviteListItem, 'status' | 'expires_at'>): boolean {
  return invite.status === 'pending' && new Date(invite.expires_at) < new Date()
}

function InviteStatusBadge({
  status,
  expired,
}: {
  status: InviteListItem['status']
  expired: boolean
}) {
  if (status === 'pending' && expired) {
    return (
      <Badge variant="destructive" className="text-[10px] gap-1">
        <Clock className="h-3 w-3" />
        Expired
      </Badge>
    )
  }
  const map: Record<
    InviteListItem['status'],
    { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  > = {
    pending: { label: 'Pending', variant: 'secondary' },
    accepted: { label: 'Accepted', variant: 'default' },
    revoked: { label: 'Revoked', variant: 'outline' },
    expired: { label: 'Expired', variant: 'destructive' },
  }
  const config = map[status]
  return (
    <Badge variant={config.variant} className="text-[10px]">
      {config.label}
    </Badge>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?'
}

export function MembersTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [removeTarget, setRemoveTarget] = useState<RosterMember | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['roster'],
    queryFn: getRoster,
  })

  const invitesQuery = useQuery({
    queryKey: ['invites'],
    queryFn: listInvitesAction,
  })

  const members = data?.members ?? []
  const error = data?.error
  const invites = invitesQuery.data?.data ?? []
  const invitesError = invitesQuery.data?.error

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['roster'] })
    queryClient.invalidateQueries({ queryKey: ['invites'] })
  }

  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'org_admin' | 'member' }) =>
      updateMemberRole(memberId, role),
    onSuccess: (res) => {
      if (res?.error) {
        toast(res.error, 'error')
      } else {
        toast('Member role updated', 'success')
        refresh()
      }
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: (res) => {
      setRemoveTarget(null)
      if (res?.error) {
        toast(res.error, 'error')
      } else {
        toast('Member removed from organization', 'success')
        refresh()
      }
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInviteAction(inviteId),
    onSuccess: (res) => {
      if (res?.error) {
        toast(res.error, 'error')
      } else {
        toast('Invite revoked', 'success')
        refresh()
      }
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const resendMutation = useMutation({
    mutationFn: (inviteId: string) => resendInviteAction(inviteId),
    onSuccess: (res) => {
      if (res?.error) {
        toast(res.error, 'error')
      } else {
        toast('Invite resent', 'success')
        refresh()
      }
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const loading = isLoading || roleMutation.isPending

  return (
    <div className="space-y-6">
      <Card className="glass-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground font-headline">Members</CardTitle>
              <CardDescription>
                Manage who belongs to this organization and their roles
              </CardDescription>
            </div>
            {members.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {members.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError || error ? (
            <ErrorState
              title="Could not load members"
              description={error ?? 'Something went wrong while loading the member list'}
              onRetry={refresh}
            />
          ) : members.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No members yet"
              description="Invite people to your organization to get started"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback
                            className={member.is_suspended ? 'opacity-50' : undefined}
                          >
                            {initials(member.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {member.display_name}
                            </span>
                            {member.is_self && (
                              <Badge variant="outline" className="text-[10px]">
                                You
                              </Badge>
                            )}
                            {member.is_suspended && (
                              <Badge variant="destructive" className="text-[10px]">
                                Suspended
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{member.email || 'No email'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role === 'org_admin'
                            ? 'default'
                            : member.role === 'super_admin'
                              ? 'outline'
                              : 'secondary'
                        }
                        className="gap-1"
                      >
                        {member.role === 'org_admin' ? (
                          <Crown className="h-3 w-3" />
                        ) : member.role === 'super_admin' ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : null}
                        {ROLE_LABEL[member.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.member_since)}
                    </TableCell>
                    <TableCell className="text-right">
                      {!member.is_self && member.role !== 'super_admin' ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Member actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role === 'member' ? (
                              <DropdownMenuItem
                                disabled={loading}
                                onClick={() =>
                                  roleMutation.mutate({
                                    memberId: member.user_id,
                                    role: 'org_admin',
                                  })
                                }
                              >
                                <ShieldPlus className="mr-2 h-4 w-4" />
                                Promote to Org Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={loading}
                                onClick={() =>
                                  roleMutation.mutate({
                                    memberId: member.user_id,
                                    role: 'member',
                                  })
                                }
                              >
                                <ShieldMinus className="mr-2 h-4 w-4" />
                                Demote to Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={loading}
                              className="text-red-400 focus:text-red-400"
                              onClick={() => setRemoveTarget(member)}
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <Mail className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-foreground font-headline">Invitations</CardTitle>
              <CardDescription>
                Invite people by email — links last 7 days and are single-use
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <InviteForm onSent={refresh} />

          <div className="pt-4 border-t border-border/20">
            {invitesQuery.isLoading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            ) : invitesError ? (
              <ErrorState
                title="Could not load invites"
                description={invitesError}
                onRetry={() => queryClient.invalidateQueries({ queryKey: ['invites'] })}
              />
            ) : invites.length === 0 ? (
              <EmptyState
                icon={<Mail className="h-8 w-8" />}
                title="No invitations yet"
                description="Invite someone to join your organization"
              />
            ) : (
              <ul className="divide-y divide-border/20">
                {invites.map((invite) => {
                  const expired = isExpired(invite)
                  const actionable = invite.status === 'pending' || expired
                  return (
                    <li
                      key={invite.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 py-3"
                    >
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {invite.email}
                          </span>
                          <InviteStatusBadge
                            status={invite.status}
                            expired={expired}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {expired
                            ? 'Expired — ask to resend'
                            : `Expires ${formatDate(invite.expires_at)}`}
                          {invite.invited_by_email
                            ? ` · by ${invite.invited_by_email}`
                            : ''}
                        </p>
                      </div>
                      {actionable && (
                        <div className="flex items-center gap-2 sm:shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resendMutation.isPending}
                            onClick={() => resendMutation.mutate(invite.id)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            Resend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-400"
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(invite.id)}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1.5" />
                            Revoke
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Remove member?</DialogTitle>
            <DialogDescription>
              {removeTarget?.display_name} will lose access to this organization and its
              expenses immediately. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.user_id)}
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
