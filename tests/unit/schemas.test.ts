import { describe, it, expect } from 'vitest'
import { budgetSchema } from '@/entities/budget/schema'
import { inviteSchema, inviteInsertSchema } from '@/entities/invite/schema'
import {
  orgSchema,
  orgMemberSchema,
  clientRequestSchema,
  planSchema,
  subscriptionSchema,
} from '@/entities/org/schema'

const UUID = '11111111-1111-4111-8111-111111111111'

describe('budgetSchema', () => {
  it('accepts a valid budget', () => {
    const result = budgetSchema.safeParse({
      id: UUID,
      scope: 'org',
      org_id: UUID,
      user_id: UUID,
      category_id: UUID,
      amount_cents: 10000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a negative budget', () => {
    expect(budgetSchema.safeParse({
      id: UUID, scope: 'user', org_id: null, user_id: UUID, category_id: UUID, amount_cents: -1,
    }).success).toBe(false)
  })

  it('rejects a non-integer amount', () => {
    expect(budgetSchema.safeParse({
      id: UUID, scope: 'user', org_id: null, user_id: UUID, category_id: UUID, amount_cents: 1.5,
    }).success).toBe(false)
  })

  it('rejects an invalid scope', () => {
    expect(budgetSchema.safeParse({
      id: UUID, scope: 'admin', org_id: null, user_id: UUID, category_id: UUID, amount_cents: 100,
    }).success).toBe(false)
  })
})

describe('inviteSchema', () => {
  it('accepts a valid invite', () => {
    expect(inviteSchema.safeParse({
      id: UUID, org_id: UUID, email: 'a@b.com', token: 'tok',
      invited_by: UUID, status: 'pending', accepted_by: null,
      expires_at: '2024-01-01', created_at: '2024-01-01',
      send_id: null, last_sent_at: null,
    }).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(inviteSchema.safeParse({
      id: UUID, org_id: UUID, email: 'nope', token: 'tok',
      invited_by: null, status: 'pending', accepted_by: null,
      expires_at: '2024-01-01', created_at: '2024-01-01',
      send_id: null, last_sent_at: null,
    }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(inviteSchema.safeParse({
      id: UUID, org_id: UUID, email: 'a@b.com', token: 'tok',
      invited_by: null, status: 'flying', accepted_by: null,
      expires_at: '2024-01-01', created_at: '2024-01-01',
      send_id: null, last_sent_at: null,
    }).success).toBe(false)
  })
})

describe('inviteInsertSchema', () => {
  it('accepts only insertable fields', () => {
    const result = inviteInsertSchema.safeParse({ org_id: UUID, email: 'a@b.com' })
    expect(result.success).toBe(true)
  })

  it('rejects a missing email', () => {
    expect(inviteInsertSchema.safeParse({ org_id: UUID }).success).toBe(false)
  })
})

describe('orgSchema', () => {
  it('accepts a valid org', () => {
    expect(orgSchema.safeParse({
      id: UUID, name: 'Acme', slug: 'acme', status: 'active',
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    }).success).toBe(true)
  })

  it('rejects an unknown status', () => {
    expect(orgSchema.safeParse({
      id: UUID, name: 'Acme', slug: 'acme', status: 'gone',
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    }).success).toBe(false)
  })
})

describe('orgMemberSchema', () => {
  it('accepts the member roles', () => {
    for (const role of ['super_admin', 'org_admin', 'member']) {
      expect(orgMemberSchema.safeParse({
        id: UUID, org_id: UUID, user_id: UUID, role,
        created_at: '2024-01-01T00:00:00Z',
      }).success).toBe(true)
    }
  })

  it('rejects a legacy role', () => {
    expect(orgMemberSchema.safeParse({
      id: UUID, org_id: UUID, user_id: UUID, role: 'manager',
      created_at: '2024-01-01T00:00:00Z',
    }).success).toBe(false)
  })
})

describe('clientRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(clientRequestSchema.safeParse({ name: 'Jo', email: 'jo@a.com' }).success).toBe(true)
  })

  it('defaults status to pending', () => {
    expect(clientRequestSchema.parse({ name: 'Jo', email: 'jo@a.com' }).status).toBe('pending')
  })

  it('rejects a missing name', () => {
    expect(clientRequestSchema.safeParse({ email: 'jo@a.com' }).success).toBe(false)
  })
})

describe('planSchema / subscriptionSchema', () => {
  it('accepts valid plan and subscription rows', () => {
    expect(planSchema.safeParse({
      id: UUID, name: 'Pro', slug: 'pro', price_monthly_cents: 500,
      price_yearly_cents: 5000, max_members: 5, max_expenses_per_month: 100,
      features: { reports: true }, created_at: '2024-01-01T00:00:00Z',
    }).success).toBe(true)
    expect(subscriptionSchema.safeParse({
      id: UUID, org_id: UUID, plan_id: UUID, status: 'active',
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    }).success).toBe(true)
  })

  it('rejects a non-integer plan price', () => {
    expect(planSchema.safeParse({
      id: UUID, name: 'Pro', slug: 'pro', price_monthly_cents: 5.5,
      price_yearly_cents: 5000, max_members: 5, max_expenses_per_month: 100,
      features: {}, created_at: '2024-01-01T00:00:00Z',
    }).success).toBe(false)
  })
})
