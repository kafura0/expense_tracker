import { describe, it, expect } from 'vitest'
import { validatePasswordStrength } from '@/shared/lib/password'

describe('validatePasswordStrength', () => {
  it('rejects empty password', () => {
    expect(validatePasswordStrength('')).toBe('Password must be at least 8 characters')
  })

  it('rejects short passwords', () => {
    expect(validatePasswordStrength('Abc1!')).toBe('Password must be at least 8 characters')
  })

  it('rejects missing uppercase', () => {
    expect(validatePasswordStrength('abc12345!')).toMatch(/uppercase, lowercase, number, and special/)
  })

  it('rejects missing lowercase', () => {
    expect(validatePasswordStrength('ABC12345!')).toMatch(/uppercase, lowercase, number, and special/)
  })

  it('rejects missing number', () => {
    expect(validatePasswordStrength('Abcdefgh!')).toMatch(/uppercase, lowercase, number, and special/)
  })

  it('rejects missing special character', () => {
    expect(validatePasswordStrength('Abcdefgh1')).toMatch(/uppercase, lowercase, number, and special/)
  })

  it('accepts a strong password', () => {
    expect(validatePasswordStrength('Admin@123456789!')).toBeNull()
  })
})
