import { type ExchangeRateResponse, SUPPORTED_CURRENCIES } from './types'
import { findLatestRates, isRatesStale, upsertRates } from './repository'

const FRANKFURTER_API_BASE = 'https://api.frankfurter.app'
const API_TIMEOUT_MS = 5000

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
    return data as ExchangeRateResponse
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
      rates,
    }
  }

  // Fetch fresh rates from API
  try {
    const freshRates = await fetchRatesFromAPI(baseCurrency)
    await upsertRates(freshRates)
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
      rates,
    }
  }
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