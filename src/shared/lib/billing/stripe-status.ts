/**
 * Maps a Stripe subscription status to the `subscriptions.status` CHECK enum
 * (active | trialing | cancelled | expired | past_due). Pure and unit-tested.
 */
export function mapStripeSubscriptionStatus(status: string): string {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
      return 'cancelled'
    case 'incomplete':
    case 'incomplete_expired':
      return 'expired'
    default:
      return 'active'
  }
}
