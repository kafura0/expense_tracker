/**
 * currency.ts
 *
 * Shared money formatting helpers for Ledgerly.
 *
 * All monetary values are stored as integer cents (amount_cents). These helpers
 * convert cents to a display string using the currency code associated with the
 * data being shown (the scope's base currency, or an expense's own currency).
 */

export const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$',
  KES: 'KSh',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
}

export function currencySymbol(currency = 'USD'): string {
  return CURRENCY_SYMBOL[currency] ?? currency
}

export function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatMoneyCompact(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100)
}
