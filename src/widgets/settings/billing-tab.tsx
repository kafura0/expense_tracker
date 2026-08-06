'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelSubscription,
  createCheckoutSession,
  createPortalSession,
  getBillingStatus,
} from '@/features/billing/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { useToast } from '@/shared/ui/toast'
import { ErrorState } from '@/shared/ui/error-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { formatMoney } from '@/shared/lib/currency'
import { CreditCard, Sparkles, ExternalLink, Ban, ShieldCheck, AlertTriangle } from 'lucide-react'

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'info' | 'outline' }> = {
  active: { label: 'Active', variant: 'success' },
  trialing: { label: 'Trial', variant: 'info' },
  past_due: { label: 'Past due', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  expired: { label: 'Expired', variant: 'destructive' },
}

export function BillingTab() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [confirmCancel, setConfirmCancel] = useState(false)

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['billing-status'],
    queryFn: getBillingStatus,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['billing-status'] })

  const openUrl = (url: string) => {
    window.location.href = url
  }

  const checkoutMutation = useMutation({
    mutationFn: () => createCheckoutSession({ planSlug: 'pro' }),
    onSuccess: (res) => {
      if (res?.error) toast(res.error, 'error')
      else if (res?.url) openUrl(res.url)
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const portalMutation = useMutation({
    mutationFn: () => createPortalSession(),
    onSuccess: (res) => {
      if (res?.error) toast(res.error, 'error')
      else if (res?.url) openUrl(res.url)
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelSubscription(),
    onSuccess: (res) => {
      setConfirmCancel(false)
      if (res?.error) {
        toast(res.error, 'error')
      } else {
        toast('Subscription cancelled — you will keep access until the period ends', 'success')
        refresh()
      }
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Could not load billing"
        description="Something went wrong loading your plan"
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['billing-status'] })}
      />
    )
  }

  const planName = data.plan ? (PLAN_LABEL[data.plan.slug] ?? data.plan.name) : 'Free'
  const isFree = !data.plan || data.plan.slug === 'free'
  const statusInfo = data.subscription ? STATUS_BADGE[data.subscription.status] ?? STATUS_BADGE.active : null
  const maxExpenses = data.maxExpensesThisMonth
  const usage = data.expensesThisMonth ?? 0
  const usageRatio = maxExpenses ? Math.min(100, Math.round((usage / maxExpenses) * 100)) : 0
  const nearLimit = maxExpenses != null && usageRatio >= 90

  return (
    <div className="space-y-6">
      <Card className="glass-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground font-headline">Current Plan</CardTitle>
              <CardDescription>Your workspace subscription and monthly usage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-lg font-bold text-foreground">{planName}</p>
                <p className="text-sm text-muted-foreground">
                  {data.plan && data.plan.price_monthly_cents > 0
                    ? `${formatMoney(data.plan.price_monthly_cents, 'USD')}/month`
                    : '$0 — free forever'}
                </p>
              </div>
              {statusInfo && (
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              )}
            </div>
            {data.subscription?.current_period_end && (
              <p className="text-xs text-muted-foreground">
                Renews {new Date(data.subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>

          {maxExpenses != null ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Monthly expenses</span>
                <span className={nearLimit ? 'font-medium text-amber-400' : 'text-foreground'}>
                  {usage} / {maxExpenses}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    nearLimit ? 'bg-amber-400' : 'bg-primary'
                  }`}
                  style={{ width: `${usageRatio}%` }}
                />
              </div>
              {nearLimit && (
                <p className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  {isFree
                    ? 'Free plans are limited to 50 expenses per month. Upgrade to Pro for unlimited.'
                    : 'This workspace is close to its monthly limit.'}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No monthly expense limit applies.</p>
          )}

          {!data.enabled && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Stripe checkout is not configured for this deployment yet. Plan limits are still
                enforced — reach out to your administrator to enable payments.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {data.isOrgAdmin && (
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground font-headline">Manage Subscription</CardTitle>
            <CardDescription>Upgrade, update payment details, or cancel</CardDescription>
          </CardHeader>
          <CardContent>
            {data.enabled ? (
              <div className="flex flex-wrap gap-3">
                {isFree && (
                  <Button
                    onClick={() => checkoutMutation.mutate()}
                    loading={checkoutMutation.isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Sparkles className="h-4 w-4" />
                    Upgrade to Pro
                  </Button>
                )}
                {data.subscription?.hasStripeCustomer && (
                  <Button
                    variant="outline"
                    onClick={() => portalMutation.mutate()}
                    loading={portalMutation.isPending}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Manage Billing
                  </Button>
                )}
                {data.subscription?.hasStripeSubscription &&
                  data.subscription.status === 'active' && (
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmCancel(true)}
                      disabled={cancelMutation.isPending}
                    >
                      <Ban className="h-4 w-4" />
                      Cancel Subscription
                    </Button>
                  )}
                {isFree && !data.subscription?.hasStripeCustomer && (
                  <p className="w-full text-xs text-muted-foreground">
                    You&apos;re on the Free plan. Upgrade any time — no card required until checkout.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Checkout and the billing portal are unavailable until Stripe is configured.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {isFetching && !isLoading && <p className="text-xs text-muted-foreground">Refreshing…</p>}

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription?</DialogTitle>
            <DialogDescription>
              You&apos;ll keep access to Pro features until the current billing period ends, then
              this workspace drops to the Free plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)} disabled={cancelMutation.isPending}>
              Keep my plan
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              loading={cancelMutation.isPending}
            >
              Cancel subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
