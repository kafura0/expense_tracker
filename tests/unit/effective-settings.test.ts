import { describe, it, expect } from 'vitest'
import { resolveEffectiveSettings, isValidOrgSlug } from '@/shared/lib/effective-settings'

const ORG = { default_currency: 'KES', default_vat_rate: 16 }
const EMPTY_ORG = { default_currency: null, default_vat_rate: null }

describe('resolveEffectiveSettings', () => {
  it('uses personal overrides when present', () => {
    const result = resolveEffectiveSettings(ORG, { base_currency: 'EUR', vat_rate: 8 })
    expect(result.base_currency).toBe('EUR')
    expect(result.vat_rate).toBe(8)
    expect(result.currency_override).toBe(true)
    expect(result.vat_override).toBe(true)
  })

  it('falls back to org defaults when personal values are null', () => {
    const result = resolveEffectiveSettings(ORG, { base_currency: null, vat_rate: null })
    expect(result.base_currency).toBe('KES')
    expect(result.vat_rate).toBe(16)
    expect(result.currency_override).toBe(false)
    expect(result.vat_override).toBe(false)
    expect(result.org_default_currency).toBe('KES')
    expect(result.org_default_vat_rate).toBe(16)
  })

  it('falls back to hardcoded defaults when org has none', () => {
    const result = resolveEffectiveSettings(EMPTY_ORG, { base_currency: null, vat_rate: null })
    expect(result.base_currency).toBe('USD')
    expect(result.vat_rate).toBeGreaterThan(0)
  })
})

describe('isValidOrgSlug', () => {
  it('accepts valid lowercase slugs', () => {
    expect(isValidOrgSlug('acme')).toBe(true)
    expect(isValidOrgSlug('acme-corp')).toBe(true)
    expect(isValidOrgSlug('acme1')).toBe(true)
  })

  it('rejects invalid slugs', () => {
    expect(isValidOrgSlug('')).toBe(false)
    expect(isValidOrgSlug('Acme')).toBe(false)
    expect(isValidOrgSlug('acme_')).toBe(false)
    expect(isValidOrgSlug('acme ')).toBe(false)
    expect(isValidOrgSlug('a'.repeat(64))).toBe(false)
  })
})
