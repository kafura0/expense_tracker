import Stripe from 'stripe'

/**
 * True when a Stripe secret key is configured. Billing degrades gracefully
 * (plan reads keep working, checkout/portal/cancel are disabled) when unset.
 */
export function isBillingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/** Server-side Stripe client. Returns null when billing is not configured. */
export function createStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}
