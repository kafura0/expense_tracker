import { describe, expect, it } from 'vitest'
import { advanceDueDate, buildMissedSchedule } from '@/entities/recurring/dates'
import { recurringExpenseInsertSchema, recurringExpenseUpdateSchema } from '@/entities/recurring/schema'

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('recurring dates', () => {
  describe('advanceDueDate', () => {
    it('advances weekly by 7 days', () => {
      const next = advanceDueDate(new Date(2026, 0, 1), 'weekly')
      expect(ymd(next)).toBe('2026-01-08')
    })

    it('advances monthly to the last day of a short month (Jan 31 -> Feb 28)', () => {
      const next = advanceDueDate(new Date(2026, 0, 31), 'monthly')
      expect(next.getMonth()).toBe(1)
      expect(next.getDate()).toBe(28)
    })

    it('advances yearly by 12 months', () => {
      const next = advanceDueDate(new Date(2026, 5, 15), 'yearly')
      expect(ymd(next)).toBe('2027-06-15')
    })
  })

  describe('buildMissedSchedule', () => {
    it('returns the due date as missed when it is today', () => {
      const today = new Date(2026, 2, 20)
      const { missed, next } = buildMissedSchedule(new Date(2026, 2, 20), 'weekly', today)
      expect(missed).toHaveLength(1)
      expect(ymd(missed[0])).toBe('2026-03-20')
      expect(ymd(next)).toBe('2026-03-27')
    })

    it('catches up all missed monthly periods before the next future date', () => {
      const today = new Date(2026, 2, 20)
      const { missed, next } = buildMissedSchedule(new Date(2026, 0, 1), 'monthly', today)
      expect(missed.map((d) => d.getMonth())).toEqual([0, 1, 2])
      expect(next.getMonth()).toBe(3)
      expect(next.getFullYear()).toBe(2026)
    })

    it('returns no missed dates when the next due date is in the future', () => {
      const today = new Date(2026, 2, 20)
      const { missed, next } = buildMissedSchedule(new Date(2026, 4, 1), 'monthly', today)
      expect(missed).toHaveLength(0)
      expect(ymd(next)).toBe('2026-05-01')
    })
  })
})

describe('recurring schemas', () => {
  it('accepts a typical create payload without next_due_date', () => {
    const payload = {
      description: 'Office rent',
      entry_type: 'expense',
      amount_cents: 85000,
      currency: 'USD',
      category_id: null,
      frequency: 'monthly',
      start_date: '2026-03-01',
    }
    const result = recurringExpenseInsertSchema.safeParse(payload)
    expect(result.success, result.success ? '' : JSON.stringify(result.error?.issues)).toBe(true)
  })

  it('rejects an invalid frequency and a zero amount', () => {
    const base = {
      description: 'Rent',
      amount_cents: 0,
      currency: 'USD',
      category_id: null,
      frequency: 'daily',
      start_date: '2026-03-01',
    }
    const result = recurringExpenseInsertSchema.safeParse(base)
    expect(result.success).toBe(false)
  })

  it('update schema allows toggling is_active only', () => {
    const result = recurringExpenseUpdateSchema.safeParse({ is_active: false })
    expect(result.success).toBe(true)
  })
})
