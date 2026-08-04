import { describe, it, expect } from 'vitest'
import { toLocalDateTimeLocal } from '@/shared/lib/datetime'

describe('toLocalDateTimeLocal', () => {
  it('formats a Date in local time as YYYY-MM-DDTHH:mm', () => {
    const d = new Date(2024, 0, 15, 9, 5) // Jan 15 2024 09:05 local
    expect(toLocalDateTimeLocal(d)).toBe('2024-01-15T09:05')
  })

  it('accepts an ISO string', () => {
    // Round-tripped: construct from a Date to avoid TZ dependence
    const d = new Date(2024, 5, 3, 14, 30)
    expect(toLocalDateTimeLocal(d.toISOString())).toBe('2024-06-03T14:30')
  })

  it('pads single-digit components', () => {
    const d = new Date(2024, 11, 1, 0, 0)
    expect(toLocalDateTimeLocal(d)).toBe('2024-12-01T00:00')
  })

  it('returns empty string for an invalid date', () => {
    expect(toLocalDateTimeLocal('not-a-date')).toBe('')
    expect(toLocalDateTimeLocal(new Date('invalid'))).toBe('')
  })
})
