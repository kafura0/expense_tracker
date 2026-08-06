import { describe, expect, it } from 'vitest'
import { expenseSchema, expenseInsertSchema } from '@/entities/expense/schema'

describe('expense schema', () => {
  describe('expenseInsertSchema', () => {
    it('accepts a typical submission payload', () => {
      const payload = {
        amount_cents: 25000,
        entry_type: 'expense' as const,
        currency: 'USD' as const,
        category_id: 'd1a26e6e-f5f5-4a88-b709-12670acbf284',
        date: '2026-08-02T14:30:00.000Z',
        notes: 'Team lunch',
        tax_applicable: false,
        is_taxable: false,
        converted_amount_cents: 25000,
        converted_currency: 'USD',
        exchange_rate_used: 1,
      }
      const result = expenseInsertSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects NaN amounts (invalid_type surfaces as "Expected number")', () => {
      const payload = {
        amount_cents: Number.NaN,
        entry_type: 'expense',
        currency: 'USD',
        date: '2026-08-02T14:30:00.000Z',
        tax_applicable: false,
        is_taxable: false,
        converted_amount_cents: Number.NaN,
      }
      const result = expenseInsertSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'))
        expect(paths).toContain('amount_cents')
        expect(paths).toContain('converted_amount_cents')
      }
    })

    it('accepts an income entry (boundary enum value)', () => {
      const payload = {
        amount_cents: 100_000,
        entry_type: 'income' as const,
        currency: 'USD' as const,
        date: '2026-08-02T14:30:00.000Z',
        tax_applicable: false,
        is_taxable: false,
      }
      const result = expenseInsertSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects an unknown entry_type', () => {
      const payload = {
        amount_cents: 1000,
        entry_type: 'refund',
        currency: 'USD',
        date: '2026-08-02T14:30:00.000Z',
        tax_applicable: false,
        is_taxable: false,
      }
      const result = expenseInsertSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.map((i) => i.path.join('.'))).toContain('entry_type')
      }
    })

    it('rejects a zero amount (min is 1 cent)', () => {
      const payload = {
        amount_cents: 0,
        entry_type: 'expense' as const,
        currency: 'USD' as const,
        date: '2026-08-02T14:30:00.000Z',
        tax_applicable: false,
        is_taxable: false,
      }
      const result = expenseInsertSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('rejects a negative amount', () => {
      const payload = {
        amount_cents: -500,
        entry_type: 'expense' as const,
        currency: 'USD' as const,
        date: '2026-08-02T14:30:00.000Z',
        tax_applicable: false,
        is_taxable: false,
      }
      const result = expenseInsertSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('accepts exactly the max amount ($1,000,000.00) and rejects one cent more', () => {
      const base = {
        entry_type: 'expense' as const,
        currency: 'USD' as const,
        date: '2026-08-02T14:30:00.000Z',
        tax_applicable: false,
        is_taxable: false,
      }
      expect(expenseInsertSchema.safeParse({ ...base, amount_cents: 100_000_000 }).success).toBe(true)
      expect(expenseInsertSchema.safeParse({ ...base, amount_cents: 100_000_001 }).success).toBe(false)
    })
  })

  describe('expenseSchema (repository response)', () => {
    it('accepts a returned DB row whose nullable columns are null (regression)', () => {
      const row = {
        id: 'b401ad97-9cd7-4080-b0e8-57d4f0c41a9c',
        user_id: '00000000-0000-0000-0000-000000000001',
        org_id: '00000000-0000-0000-0000-000000000002',
        amount_cents: 25000,
        entry_type: 'expense',
        currency: 'USD',
        date: '2026-08-02T14:30:00.000Z',
        title: null,
        notes: null,
        tax_applicable: false,
        is_taxable: false,
        converted_amount_cents: null,
        converted_currency: null,
        exchange_rate_used: null,
        tax_rate_used: null,
        tax_amount_cents: null,
      }
      const result = expenseSchema.safeParse(row)
      expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true)
    })

    it('accepts a solo-user row with a null org_id (regression)', () => {
      const row = {
        id: 'b401ad97-9cd7-4080-b0e8-57d4f0c41a9c',
        user_id: '00000000-0000-0000-0000-000000000001',
        org_id: null,
        amount_cents: 1234,
        entry_type: 'expense',
        currency: 'KES',
        date: '2026-08-06T09:00:00.000Z',
        title: null,
        notes: 'E2E Receipt',
        tax_applicable: false,
        is_taxable: false,
        converted_amount_cents: null,
        converted_currency: null,
        exchange_rate_used: null,
        tax_rate_used: null,
        tax_amount_cents: null,
      }
      const result = expenseSchema.safeParse(row)
      expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true)
    })

    it('still enforces types when values are present', () => {
      const row = {
        id: 'b401ad97-9cd7-4080-b0e8-57d4f0c41a9c',
        user_id: '00000000-0000-0000-0000-000000000001',
        org_id: '00000000-0000-0000-0000-000000000002',
        amount_cents: 25000,
        entry_type: 'expense',
        currency: 'USD',
        date: '2026-08-02T14:30:00.000Z',
        title: 'Tea',
        notes: 'Breakfast run',
        tax_applicable: false,
        is_taxable: true,
        converted_amount_cents: 25000,
        converted_currency: 'USD',
        exchange_rate_used: 1,
        tax_rate_used: 16,
        tax_amount_cents: 4000,
      }
      const result = expenseSchema.safeParse(row)
      expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true)
    })
  })
})
