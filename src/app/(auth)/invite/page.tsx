'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/shared/ui/logo'
import {
  getInviteDetails,
  acceptInviteAction,
  type InviteDetails,
} from './actions'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { Building2, Users, ArrowLeft, CheckCircle, AlertTriangle, Ban, Clock, FileQuestion } from 'lucide-react'

function StateMessage({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: React.ReactNode
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-foreground font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actionHref && actionLabel && (
        <Link href={actionHref}>
          <Button variant="outline" className="w-full h-11 gap-2">
            <ArrowLeft className="h-4 w-4" />
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  )
}

function InviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [details, setDetails] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(!!token)
  const [loadError, setLoadError] = useState(token ? '' : 'No invite token provided')
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!token) return

    getInviteDetails(token).then((result) => {
      if (result.error) {
        setLoadError(result.error)
      } else if (result.data) {
        setDetails(result.data)
      }
      setLoading(false)
    })
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)

    const result = await acceptInviteAction(token)

    if (result.error) {
      if (result.error === 'invite.expired') {
        setDetails((prev) => (prev ? { ...prev, state: 'expired' } : prev))
      } else if (result.error === 'invite.revoked') {
        setDetails((prev) => (prev ? { ...prev, state: 'revoked' } : prev))
      } else if (result.error === 'invite.accepted') {
        setDetails((prev) => (prev ? { ...prev, state: 'accepted' } : prev))
      } else {
        setLoadError(result.error)
      }
      setAccepting(false)
    } else {
      setAccepted(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    }
  }

  const renderState = () => {
    if (loadError) {
      return (
        <StateMessage
          icon={<FileQuestion className="h-7 w-7 text-muted-foreground" />}
          title="This invite link is invalid"
          description={loadError}
          actionHref="/login"
          actionLabel="Go to Login"
        />
      )
    }

    if (!details) return null

    switch (details.state) {
      case 'expired':
        return (
          <StateMessage
            icon={<Clock className="h-7 w-7 text-amber-400" />}
            title="This invite link has expired"
            description="Ask an Org Admin to send you a new invite. Links last 7 days."
            actionHref="/login"
            actionLabel="Go to Login"
          />
        )
      case 'revoked':
        return (
          <StateMessage
            icon={<Ban className="h-7 w-7 text-red-400" />}
            title="This invite was revoked"
            description="The Org Admin cancelled this invitation. Ask them for a new one if you still want to join."
            actionHref="/login"
            actionLabel="Go to Login"
          />
        )
      case 'accepted':
        return (
          <StateMessage
            icon={<CheckCircle className="h-7 w-7 text-emerald-400" />}
            title="You've already joined this organization"
            description="This invite has already been accepted."
            actionHref="/dashboard"
            actionLabel="Go to Dashboard"
          />
        )
      case 'not_found':
        return (
          <StateMessage
            icon={<FileQuestion className="h-7 w-7 text-muted-foreground" />}
            title="Invite not found"
            description="This invite may have been removed or the link is incorrect. Ask an Org Admin to send a new invite."
            actionHref="/login"
            actionLabel="Go to Login"
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2 md:px-4 py-8 md:py-12 relative overflow-hidden text-center">
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="max-w-md w-full space-y-6 md:space-y-8 relative z-10 animate-fade-in">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block mb-4">
            <Logo size={48} />
          </Link>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            You&apos;re Invited
          </h2>
          <p className="text-sm text-muted-foreground">
            Join an organization on Ledgerly
          </p>
        </div>

        <Card className="glass-card rounded-2xl border-0 animate-slide-up">
          <CardContent className="p-6 md:p-8">
            {loading && (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            )}

            {!loading && details?.state !== 'pending' && renderState()}

            {!loading && !accepted && details?.state === 'pending' && (
              <div className="space-y-6">
                <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{details.org_name}</p>
                      <p className="text-xs text-muted-foreground">{details.email || 'Invited account'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Org Member</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-left">
                  <AlertTriangle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Your existing expenses will move into this organization and will be
                    visible org-wide once you join.
                  </p>
                </div>

                <Button
                  onClick={handleAccept}
                  disabled={accepting}
                  loading={accepting}
                  className="w-full h-11"
                >
                  Accept Invite
                </Button>

                <div className="text-center">
                  <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Not you? Go to login
                  </Link>
                </div>
              </div>
            )}

            {accepted && details && (
              <div className="text-center py-4 space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <p className="text-foreground font-medium">Welcome to {details.org_name}!</p>
                <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Skeleton className="h-64 w-full max-w-md rounded-2xl" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  )
}
