import { type ExchangeRateResponse, SUPPORTED_CURRENCIES } from './types'
import { findLatestRates, isRatesStale, upsertRates } from './repository'
import { fillMissingRates } from './utils'
const FRANKFURTER_API_BASE = 'https://api.frankfurter.app'
const API_TIMEOUT_MS = 5000

export { fillMissingRates, convertAmount } from './utils'

export async function fetchRatesFromAPI(baseCurrency: string): Promise<ExchangeRateResponse> {
  const targets = SUPPORTED_CURRENCIES.filter(c => c !== baseCurrency).join(',')
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${FRANKFURTER_API_BASE}/latest?from=${baseCurrency}&to=${targets}`,
      { signal: controller.signal }
    )

    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      ...data as ExchangeRateResponse,
      rates: fillMissingRates(baseCurrency, (data as ExchangeRateResponse).rates),
    }
  } catch (error) {
    console.error('Error fetching rates from Frankfurter:', error)
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getExchangeRates(baseCurrency: string): Promise<ExchangeRateResponse> {
  // Check if we have cached rates
  const stale = await isRatesStale(baseCurrency)
  
  if (!stale) {
    // Return cached rates
    const cachedRates = await findLatestRates(baseCurrency)
    const rates: Record<string, number> = {}

    cachedRates.forEach(rate => {
      rates[rate.target_currency] = rate.rate
    })

    return {
      base: baseCurrency,
      date: new Date(cachedRates[0].fetched_at).toISOString().split('T')[0],
      rates: fillMissingRates(baseCurrency, rates),
    }
  }

  // Fetch fresh rates from API
  try {
    const freshRates = await fetchRatesFromAPI(baseCurrency)
    // Caching is best-effort: RLS only allows managers/super admins to write
    // exchange_rates, and a failed upsert must not discard valid fresh rates.
    try {
      await upsertRates(freshRates)
    } catch (error) {
      console.warn('Failed to cache exchange rates:', error)
    }
    return freshRates
  } catch {
    // Fallback to stale cache
    console.warn('API failed, falling back to stale cache')
    const cachedRates = await findLatestRates(baseCurrency)
    
    if (cachedRates.length === 0) {
      throw new Error('No exchange rates available')
    }

    const rates: Record<string, number> = {}

    cachedRates.forEach(rate => {
      rates[rate.target_currency] = rate.rate
    })

    return {
      base: baseCurrency,
      date: new Date(cachedRates[0].fetched_at).toISOString().split('T')[0],
      rates: fillMissingRates(baseCurrency, rates),
    }
  }
}
