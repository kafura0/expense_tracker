'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getInviteDetails, acceptInviteAction } from './actions'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { Building2, Shield, Users, ArrowLeft, CheckCircle } from 'lucide-react'

interface InviteDetails {
  email: string
  role: 'manager' | 'client'
  expires_at: string
  org_name: string
}

function InviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [details, setDetails] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(!!token)
  const [error, setError] = useState(token ? '' : 'No invite token provided')
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!token) return

    getInviteDetails(token).then((result) => {
      if (result.error) {
        setError(result.error)
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
      setError(result.error)
      setAccepting(false)
    } else {
      setAccepted(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2 md:px-4 py-8 md:py-12 relative overflow-hidden text-center">
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="max-w-md w-full space-y-6 md:space-y-8 relative z-10 animate-fade-in">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block mb-4">
            <span className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              Ledgerly
            </span>
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

            {!loading && error && (
              <div className="text-center space-y-4">
                <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg">
                  {error}
                </div>
                <Link href="/login">
                  <Button variant="outline" className="w-full h-11 gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Go to Login
                  </Button>
                </Link>
              </div>
            )}

            {!loading && !error && details && (
              <div className="space-y-6">
                {accepted ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                    </div>
                    <p className="text-foreground font-medium">Welcome to {details.org_name}!</p>
                    <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{details.org_name}</p>
                          <p className="text-xs text-muted-foreground">{details.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {details.role === 'manager' ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground capitalize">
                          {details.role} role
                        </span>
                      </div>
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
                  </>
                )}
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
