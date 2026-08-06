import { describe, it, expect } from 'vitest'
import { mapStripeSubscriptionStatus } from '@/shared/lib/billing/stripe-status'

describe('mapStripeSubscriptionStatus', () => {
  it('maps active and trialing straight through', () => {
    expect(mapStripeSubscriptionStatus('active')).toBe('active')
    expect(mapStripeSubscriptionStatus('trialing')).toBe('trialing')
  })

  it('maps unpaid to past_due alongside past_due', () => {
    expect(mapStripeSubscriptionStatus('past_due')).toBe('past_due')
    expect(mapStripeSubscriptionStatus('unpaid')).toBe('past_due')
  })

  it('maps canceled to the cancelled enum', () => {
    expect(mapStripeSubscriptionStatus('canceled')).toBe('cancelled')
  })

  it('maps incomplete states to expired', () => {
    expect(mapStripeSubscriptionStatus('incomplete')).toBe('expired')
    expect(mapStripeSubscriptionStatus('incomplete_expired')).toBe('expired')
  })

  it('fails open to active for unknown statuses', () => {
    expect(mapStripeSubscriptionStatus('paused')).toBe('active')
  })
})
