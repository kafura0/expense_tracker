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

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount

  // Convert to base first, then to target
  const inBase = amount / (rates[fromCurrency] || 1)
  return inBase * (rates[toCurrency] || 1)
}
