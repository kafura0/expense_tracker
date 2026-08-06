import { describe, it, expect } from 'vitest'
import {
  wouldExceedMonthlyCap,
  buildCapMessage,
  ExpenseCapExceededError,
} from '@/entities/billing/enforcement'

describe('wouldExceedMonthlyCap', () => {
  it('allows an expense under the cap', () => {
    expect(wouldExceedMonthlyCap(50, 10)).toBe(false)
  })

  it('allows the expense that exactly fills the cap', () => {
    expect(wouldExceedMonthlyCap(50, 49)).toBe(false)
  })

  it('blocks the expense once the cap is already used', () => {
    expect(wouldExceedMonthlyCap(50, 50)).toBe(true)
  })

  it('rejects the expense that crosses the cap by one', () => {
    expect(wouldExceedMonthlyCap(50, 50, 1)).toBe(true)
    expect(wouldExceedMonthlyCap(50, 49, 2)).toBe(true)
  })

  it('respects a custom additional count', () => {
    expect(wouldExceedMonthlyCap(50, 48, 2)).toBe(false)
    expect(wouldExceedMonthlyCap(50, 49, 2)).toBe(true)
  })

  it('blocks every expense at a zero cap', () => {
    expect(wouldExceedMonthlyCap(0, 0)).toBe(true)
    expect(wouldExceedMonthlyCap(0, 0, 1)).toBe(true)
  })

  it('treats a negative cap as unlimited', () => {
    expect(wouldExceedMonthlyCap(-1, 1_000_000)).toBe(false)
    expect(wouldExceedMonthlyCap(-1, 1_000_000, 100)).toBe(false)
  })
})

describe('buildCapMessage', () => {
  it('mentions the limit and the current usage', () => {
    const message = buildCapMessage(50, 50)
    expect(message).toContain('50 monthly expense limit')
    expect(message).toContain('50 created this month')
    expect(message).toContain('Pro plan')
  })
})

describe('ExpenseCapExceededError', () => {
  it('carries the limit and used count for the caller', () => {
    const error = new ExpenseCapExceededError(50, 50)
    expect(error.name).toBe('ExpenseCapExceededError')
    expect(error.limit).toBe(50)
    expect(error.usedThisMonth).toBe(50)
    expect(error.message).toContain('Pro plan')
  })
})
