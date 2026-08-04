/**
 * Effective-value resolver for org-wide defaults vs. personal overrides
 * (FR-18, FR-19, AD-8).
 *
 * Precedence: personal override → org default → hardcoded fallback.
 * A `null` personal value means "inherit the org default" — this is how a
 * per-field override is cleared (FR-19).
 */

import { DEFAULT_VAT_RATE } from '@/shared/lib/vat'

export interface OrgDefaults {
  default_currency: string | null
  default_vat_rate: number | null
}

export interface PersonalOverrides {
  base_currency: string | null
  vat_rate: number | null
}

export interface EffectiveSettings {
  base_currency: string
  vat_rate: number
  currency_override: boolean
  vat_override: boolean
  /** The org default that applies when there is no personal override. */
  org_default_currency: string | null
  org_default_vat_rate: number | null
}

export function resolveEffectiveSettings(
  org: OrgDefaults,
  personal: PersonalOverrides
): EffectiveSettings {
  const orgDefaultCurrency = org.default_currency ?? 'USD'
  const orgDefaultVat = org.default_vat_rate ?? DEFAULT_VAT_RATE

  return {
    base_currency: personal.base_currency ?? orgDefaultCurrency,
    vat_rate: personal.vat_rate ?? orgDefaultVat,
    currency_override: personal.base_currency != null,
    vat_override: personal.vat_rate != null,
    org_default_currency: org.default_currency,
    org_default_vat_rate: org.default_vat_rate,
  }
}

export const ORG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidOrgSlug(slug: string): boolean {
  return ORG_SLUG_PATTERN.test(slug) && slug.length <= 63
}
