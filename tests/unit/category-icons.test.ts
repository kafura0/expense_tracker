import { describe, it, expect } from 'vitest'
import { getCategoryIcon } from '@/shared/lib/category-icons'

describe('getCategoryIcon', () => {
  it('returns the mapped icon component for known names', () => {
    expect(getCategoryIcon('briefcase')).toBeTruthy()
    expect(getCategoryIcon('groceries')).toBeTruthy()
    expect(getCategoryIcon('piggy-bank')).toBeTruthy()
  })

  it('resolves aliases', () => {
    expect(getCategoryIcon('housing')).toBe(getCategoryIcon('home'))
    expect(getCategoryIcon('transport')).toBe(getCategoryIcon('car'))
  })

  it('falls back to the default icon for unknown or empty names', () => {
    const fallback = getCategoryIcon(undefined)
    expect(getCategoryIcon('nope')).toBe(fallback)
    expect(getCategoryIcon(null)).toBe(fallback)
  })
})
