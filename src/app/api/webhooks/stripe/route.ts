import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/shared/lib/supabase/service'
import { mapStripeSubscriptionStatus } from '@/shared/lib/billing/stripe-status'

export const runtime = 'nodejs'

/**
 * Resolves the plan slug for a Stripe subscription. Prefers the metadata set
 * at checkout (`plan_slug`) and falls back to the product metadata on the
 * subscription's first price (so subscriptions created outside this app —
 * e.g. via the dashboard — still map to a plan).
 */
async function resolvePlanSlug(
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.plan_slug
  if (fromMetadata) return fromMetadata

  const price = subscription.items?.data?.[0]?.price
  if (!price) return null
  const product = await stripe.products.retrieve(price.product as string)
  return product.metadata?.ledgerly_plan_slug ?? null
}

/**
 * Creates or updates the `subscriptions` row for a Stripe subscription.
 * Idempotent — safe to run from `customer.subscription.created`,
 * `.updated`, `.deleted`, and `checkout.session.completed` alike. Uses the
 * service-role client because webhooks carry no user session.
 */
async function upsertSubscription(
  stripe: Stripe,
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  subscription: Stripe.Subscription
): Promise<void> {
  const orgId = subscription.metadata?.org_id
  if (!orgId) return

  const planSlug = await resolvePlanSlug(stripe, subscription)
  if (!planSlug) return

  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('slug', planSlug)
    .maybeSingle()
  if (!plan) return

  // `current_period_start/end` live on the first subscription item in the
  // current Stripe API version (they were dropped from the Subscription object).
  const period = subscription.items?.data?.[0]

  const payload = {
    org_id: orgId,
    plan_id: plan.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : null,
    stripe_subscription_id: subscription.id,
    current_period_start: period?.current_period_start
      ? new Date(period.current_period_start * 1000).toISOString()
      : null,
    current_period_end: period?.current_period_end
      ? new Date(period.current_period_end * 1000).toISOString()
      : null,
  }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('org_id', orgId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('subscriptions')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('subscriptions').insert(payload)
  }
}

export async function POST(request: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!key || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const payload = await request.text()
  let event: Stripe.Event
  try {
    event = new Stripe(key).webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Service client unavailable' }, { status: 500 })
  }
  const stripe = new Stripe(key)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode !== 'subscription' || !session.subscription) break
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        await upsertSubscription(stripe, supabase, subscription)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await upsertSubscription(stripe, supabase, event.data.object)
        break
      case 'invoice.payment_failed':
        // Status transitions (past_due, canceled) arrive via
        // `customer.subscription.updated`/`deleted`; nothing extra to do.
        break
    }
  } catch (error) {
    console.error('Stripe webhook handler error:', error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
