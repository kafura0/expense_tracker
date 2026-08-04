/**
 * totals.ts
 *
 * Currency-aware aggregation for expense rows.
 *
 * Money is stored as integer cents with an explicit currency code. Summing
 * `amount_cents` across mixed currencies silently produces a meaningless
 * number, so every aggregate that renders a single monetary value must go
 * through `sumInBaseCurrency`, which converts each row using the supplied
 * base-currency rate table and only adds a row when a real rate exists.
 *
 * `rates` maps currency code → units of that currency per 1 base unit (the
 * shape stored in the `exchange_rates` table, keyed by `base_currency`).
 */

export interface ConvertibleExpense {
  amount_cents: number
  currency: string
}

export function sumInBaseCurrency(
  expenses: ConvertibleExpense[],
  baseCurrency: string,
  rates: Record<string, number>
): number {
  let total = 0
  let converted = false

  for (const expense of expenses) {
    if (expense.currency === baseCurrency) {
      total += expense.amount_cents
      continue
    }

    // Rate table is expressed relative to the base currency: `rate` is how many
    // units of `expense.currency` buy one base unit, so amount / rate converts
    // back into the base currency. A missing rate means we cannot price it —
    // skip rather than corrupt the total with a 1:1 guess.
    const rate = rates[expense.currency]
    if (typeof rate !== 'number' || rate <= 0) continue

    total += Math.round(expense.amount_cents / rate)
    converted = true
  }

  return converted ? total : total
}

/**
 * Build the rate map consumed by `sumInBaseCurrency` from the raw rows fetched
 * from `exchange_rates` (each row: { target_currency, rate } for the base).
 */
export function buildBaseRateMap(
  rows: Array<{ target_currency: string; rate: number | null }>
): Record<string, number> {
  const rates: Record<string, number> = {}
  for (const row of rows) {
    if (row.rate !== null && row.rate > 0) {
      rates[row.target_currency] = row.rate
    }
  }
  return rates
}
