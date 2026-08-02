/**
 * Hardcoded USD→KES fallback. Frankfurter (ECB reference rates) does not
 * publish KES, so it is never present in the upstream response. When KES is
 * missing we anchor it to this documented rate, derived for any base currency
 * via the base→USD rate returned by the API (or directly when base is USD).
 */
const KES_TO_USD = 153.5

export function fillMissingRates(
  baseCurrency: string,
  rates: Record<string, number>
): Record<string, number> {
  if (rates['KES'] !== undefined) return rates

  const usdRate = baseCurrency === 'USD' ? 1 : rates['USD']
  if (!usdRate) return rates

  return { ...rates, KES: KES_TO_USD * usdRate }
}

/**
 * Converts `amount` from `fromCurrency` to `toCurrency` using `rates`.
 *
 * Returns `null` when a needed rate is missing (and the currencies differ)
 * instead of silently falling back to a 1:1 conversion — a missing rate must
 * never corrupt stored amounts.
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number | null {
  if (fromCurrency === toCurrency) return amount

  const baseRate = rates[fromCurrency]
  const quoteRate = rates[toCurrency]

  // Any missing leg means we cannot price the conversion accurately.
  if (baseRate === undefined || quoteRate === undefined) return null

  // Convert to base first, then to target
  const inBase = amount / baseRate
  return inBase * quoteRate
}
