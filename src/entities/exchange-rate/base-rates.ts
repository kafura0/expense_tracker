import type { SupabaseClient } from '@supabase/supabase-js'
import { buildBaseRateMap } from '@/entities/expense/totals'

/**
 * Fetch the latest cached base-currency rate map for client-side aggregation
 * (dashboard widgets). Returns an empty map on any error so totals degrade to
 * same-currency-only rather than failing the whole page. `exchange_rates` is
 * readable by any authenticated user (RLS) — no service key is used here.
 *
 * Lives in its own module (not `repository.ts`) because this is imported by
 * client components: `repository.ts` imports server-only clients.
 *
 * Every dashboard widget calls this for the same base currency on mount, so an
 * in-flight promise dedupe collapses that burst into a single request and a
 * short TTL keeps subsequent navigations from re-querying the (hourly-refreshed)
 * rate table. The cache is module-local to the SPA session only.
 */
const RATE_CACHE_TTL_MS = 10 * 60 * 1000
const rateCache = new Map<string, { fetchedAt: number; rates: Record<string, number> }>()
const inflight = new Map<string, Promise<Record<string, number>>>()

export function clearBaseRatesCache(): void {
  rateCache.clear()
}

async function fetchRates(supabase: SupabaseClient, baseCurrency: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('target_currency, rate')
    .eq('base_currency', baseCurrency)

  if (error) {
    console.error('Error fetching base rates:', error)
    return {}
  }

  return buildBaseRateMap((data || []) as Array<{ target_currency: string; rate: number | null }>)
}

export async function fetchBaseRates(
  supabase: SupabaseClient,
  baseCurrency: string
): Promise<Record<string, number>> {
  const cached = rateCache.get(baseCurrency)
  if (cached && Date.now() - cached.fetchedAt < RATE_CACHE_TTL_MS) {
    return cached.rates
  }

  const pending = inflight.get(baseCurrency)
  if (pending) return pending

  const promise = fetchRates(supabase, baseCurrency)
  inflight.set(baseCurrency, promise)
  try {
    const rates = await promise
    rateCache.set(baseCurrency, { fetchedAt: Date.now(), rates })
    return rates
  } finally {
    inflight.delete(baseCurrency)
  }
}
