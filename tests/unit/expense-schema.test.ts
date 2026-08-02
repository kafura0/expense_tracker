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
