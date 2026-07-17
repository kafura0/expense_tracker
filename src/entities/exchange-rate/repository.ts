import { createClient } from '@/shared/lib/supabase/client'
import { type ExchangeRate, type ExchangeRateResponse } from './types'

export async function findLatestRates(baseCurrency: string): Promise<ExchangeRate[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('base_currency', baseCurrency)
    .order('fetched_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching exchange rates:', error)
    throw error
  }

  return (data || []) as ExchangeRate[]
}

export async function isRatesStale(baseCurrency: string): Promise<boolean> {
  const rates = await findLatestRates(baseCurrency)
  
  if (rates.length === 0) return true

  const latestFetch = new Date(rates[0].fetched_at)
  const now = new Date()
  const oneHourMs = 60 * 60 * 1000

  return now.getTime() - latestFetch.getTime() > oneHourMs
}

export async function upsertRates(rates: ExchangeRateResponse): Promise<void> {
  const supabase = createClient()
  
  const now = new Date().toISOString()
  
  const rateEntries = Object.entries(rates.rates).map(([target, rate]) => ({
    base_currency: rates.base,
    target_currency: target,
    rate,
    fetched_at: now,
  }))

  const { error } = await supabase
    .from('exchange_rates')
    .upsert(rateEntries, {
      onConflict: 'base_currency,target_currency',
    })

  if (error) {
    console.error('Error upserting exchange rates:', error)
    throw error
  }
}