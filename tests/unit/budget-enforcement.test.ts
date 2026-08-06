import { describe, it, expect } from 'vitest'
import { wouldExceedBudget, buildBudgetMessage } from '@/entities/budget/enforcement'

describe('wouldExceedBudget', () => {
  it('allows spend inside the remaining budget', () => {
    expect(wouldExceedBudget(10_000, 4_000, 6_000)).toBe(false)
  })

  it('allows spend that exactly reaches the budget', () => {
    expect(wouldExceedBudget(10_000, 6_000, 4_000)).toBe(false)
    expect(wouldExceedBudget(10_000, 10_000, 0)).toBe(false)
  })

  it('rejects an overshoot of a single cent', () => {
    expect(wouldExceedBudget(10_000, 6_000, 4_001)).toBe(true)
  })

  it('allows a zero-cost entry even when the budget is exhausted', () => {
    expect(wouldExceedBudget(10_000, 10_000, 0)).toBe(false)
  })

  it('never enforces when no budget is set even if spend exists', () => {
    expect(wouldExceedBudget(0, 5_000, 1)).toBe(false)
  })

  it('flags any positive spend once the budget is already over', () => {
    expect(wouldExceedBudget(10_000, 15_000, 1)).toBe(true)
  })

  it('rejects spend above the remaining budget', () => {
    expect(wouldExceedBudget(10_000, 4_000, 6_001)).toBe(true)
    expect(wouldExceedBudget(10_000, 0, 10_001)).toBe(true)
  })

  it('rejects any spend once the budget is exhausted', () => {
    expect(wouldExceedBudget(10_000, 12_000, 1)).toBe(true)
  })

  it('never enforces when no budget is set', () => {
    expect(wouldExceedBudget(0, 0, 50_000)).toBe(false)
    expect(wouldExceedBudget(-1, 0, 50_000)).toBe(false)
  })
})

describe('buildBudgetMessage', () => {
  it('mentions the category, budget, spent, and the new amount', () => {
    const message = buildBudgetMessage(100_00, 80_00, 50_00, 'USD', 'Groceries')
    expect(message).toContain('Groceries')
    expect(message).toContain('$100.00')
    expect(message).toContain('$80.00')
    expect(message).toContain('$50.00')
  })

  it('formats non-USD currencies using their code', () => {
    const message = buildBudgetMessage(100_00, 50_00, 60_00, 'KES', 'Travel')
    expect(message).toContain('KES')
    expect(message).toContain('100.00')
  })
})
