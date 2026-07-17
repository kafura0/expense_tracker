export interface VATResult {
  tax: number
  total: number
}

export function calculateVAT(amountInCents: number, ratePercentage: number): VATResult {
  const tax = Math.round(amountInCents * (ratePercentage / 100))
  const total = amountInCents + tax

  return {
    tax,
    total,
  }
}

export function getTaxAmount(amountInCents: number, ratePercentage: number): number {
  return Math.round(amountInCents * (ratePercentage / 100))
}

export function getTotalWithTax(amountInCents: number, ratePercentage: number): number {
  const tax = Math.round(amountInCents * (ratePercentage / 100))
  return amountInCents + tax
}

export const DEFAULT_VAT_RATE = 16