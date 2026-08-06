'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { getActiveOrgId } from '@/shared/lib/org-context'
import { createStripeClient, isBillingEnabled } from '@/shared/lib/billing/stripe'
import type Stripe from 'stripe'
import { SITE_URL } from '@/shared/lib/seo'
import { logAuditEvent } from '@/shared/lib/audit-logger'

export interface BillingStatus {
  enabled: boolean
  isOrgAdmin: boolean
  plan: {
    name: string
    slug: string
    price_monthly_cents: number
    max_expenses_per_month: number
  } | null
  subscription: {
    status: string
    current_period_end: string | null
    hasStripeCustomer: boolean
    hasStripeSubscription: boolean
  } | null
  expensesThisMonth: number | null
  maxExpensesThisMonth: number | null
}

async function getOrgId(): Promise<string | null> {
  const activeOrgId = await getActiveOrgId()
  if (activeOrgId) return activeOrgId

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (!membership) return null
  return membership.org_id
}

async function requireOrgAdmin(orgId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: allowed, error } = await supabase.rpc('can_admin_org', {
    target_org_id: orgId,
  })
  if (error || !allowed) return { error: 'You do not have permission to manage billing' }
  return {}
}

/**
 * Current plan + subscription + monthly usage for the active org. Reads are
 * open to every org member; the DB columns come back undefined when the org
 * has no subscription row (fresh orgs), which the UI renders as "Free plan".
 */
export async function getBillingStatus(): Promise<BillingStatus> {
  const orgId = await getOrgId()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { enabled: isBillingEnabled(), isOrgAdmin: false, plan: null, subscription: null, expensesThisMonth: null, maxExpensesThisMonth: null }

  const role = orgId
    ? await (async () => {
        const { data } = await supabase
          .from('org_members')
          .select('role')
          .eq('org_id', orgId)
          .eq('user_id', user.id)
          .maybeSingle()
        return data?.role === 'org_admin'
      })()
    : false

  if (!orgId) {
    return { enabled: isBillingEnabled(), isOrgAdmin: false, plan: null, subscription: null, expensesThisMonth: null, maxExpensesThisMonth: null }
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, stripe_customer_id, stripe_subscription_id, plan(id, name, slug, price_monthly_cents, max_expenses_per_month)')
    .eq('org_id', orgId)
    .maybeSingle()

  const plan = subscription?.plan as unknown as {
    id: string
    name: string
    slug: string
    price_monthly_cents: number
    max_expenses_per_month: number
  } | null

  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const { count } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('entry_type', 'expense')
    .eq('is_deleted', false)
    .gte('date', from)
    .lt('date', to)

  return {
    enabled: isBillingEnabled(),
    isOrgAdmin: role,
    plan: plan
      ? {
          name: plan.name,
          slug: plan.slug,
          price_monthly_cents: plan.price_monthly_cents,
          max_expenses_per_month: plan.max_expenses_per_month,
        }
      : null,
    subscription: subscription
      ? {
          status: subscription.status,
          current_period_end: subscription.current_period_end ?? null,
          hasStripeCustomer: Boolean(subscription.stripe_customer_id),
          hasStripeSubscription: Boolean(subscription.stripe_subscription_id),
        }
      : null,
    expensesThisMonth: count ?? 0,
    maxExpensesThisMonth: plan?.max_expenses_per_month ?? null,
  }
}

/**
 * Finds the Stripe price for a plan, creating the product + monthly price on
 * first use (keyed by `ledgerly_plan_slug` metadata so it is idempotent).
 */
async function resolvePriceId(stripe: Stripe, plan: { slug: string; name: string; priceMonthlyCents: number }): Promise<string> {
  const existing = await stripe.products.search({
    query: `metadata['ledgerly_plan_slug']:'${plan.slug}'`,
  })
  if (existing.data.length > 0) {
    const product = existing.data[0]
    const prices = await stripe.prices.list({ product: product.id, limit: 1 })
    if (prices.data.length > 0) return prices.data[0].id
  }

  const product = await stripe.products.create({
    name: plan.name,
    metadata: { ledgerly_plan_slug: plan.slug },
  })
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.priceMonthlyCents,
    currency: 'usd',
    recurring: { interval: 'month' },
  })
  return price.id
}

/** Starts a Stripe Checkout session for the given plan slug (org admin only). */
export async function createCheckoutSession(input: { planSlug: string }): Promise<{ url?: string; error?: string }> {
  try {
    const orgId = await getOrgId()
    if (!orgId) return { error: 'No active organization' }

    const authz = await requireOrgAdmin(orgId)
    if (authz.error) return { error: authz.error }

    const stripe = createStripeClient()
    if (!stripe) return { error: 'Billing is not configured for this deployment' }

    const supabase = await createClient()
    const { data: plan } = await supabase
      .from('plans')
      .select('id, slug, name, price_monthly_cents')
      .eq('slug', input.planSlug)
      .maybeSingle()
    if (!plan) return { error: 'Plan not found' }
    if (plan.price_monthly_cents <= 0) return { error: 'This plan has no paid tier to check out with' }

    const priceId = await resolvePriceId(stripe, {
      slug: plan.slug,
      name: plan.name,
      priceMonthlyCents: plan.price_monthly_cents,
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: orgId,
      subscription_data: {
        metadata: { org_id: orgId, plan_slug: plan.slug },
      },
      metadata: { org_id: orgId, plan_slug: plan.slug },
      success_url: `${SITE_URL}/settings`,
      cancel_url: `${SITE_URL}/settings`,
      allow_promotion_codes: true,
    })

    if (!session.url) return { error: 'Failed to start checkout' }
    return { url: session.url }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to start checkout' }
  }
}

/** Opens the Stripe billing portal for the org's customer (org admin only). */
export async function createPortalSession(): Promise<{ url?: string; error?: string }> {
  try {
    const orgId = await getOrgId()
    if (!orgId) return { error: 'No active organization' }

    const authz = await requireOrgAdmin(orgId)
    if (authz.error) return { error: authz.error }

    const stripe = createStripeClient()
    if (!stripe) return { error: 'Billing is not configured for this deployment' }

    const supabase = await createClient()
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('org_id', orgId)
      .maybeSingle()
    if (!subscription?.stripe_customer_id) return { error: 'No billing account found for this workspace' }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${SITE_URL}/settings`,
    })

    return { url: session.url }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to open billing portal' }
  }
}

/** Cancels the org's Stripe subscription (org admin only). */
export async function cancelSubscription(): Promise<{ success?: boolean; error?: string }> {
  try {
    const orgId = await getOrgId()
    if (!orgId) return { error: 'No active organization' }

    const authz = await requireOrgAdmin(orgId)
    if (authz.error) return { error: authz.error }

    const stripe = createStripeClient()
    if (!stripe) return { error: 'Billing is not configured for this deployment' }

    const supabase = await createClient()
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('org_id', orgId)
      .maybeSingle()
    if (!subscription?.stripe_subscription_id) return { error: 'No active Stripe subscription found' }

    await stripe.subscriptions.cancel(subscription.stripe_subscription_id)

    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscription.id)

    await logAuditEvent({
      action: 'billing.subscription_cancelled',
      org_id: orgId,
      entity_type: 'subscriptions',
      entity_id: subscription.id,
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to cancel subscription' }
  }
}
