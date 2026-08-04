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
 */
export async function fetchBaseRates(
  supabase: SupabaseClient,
  baseCurrency: string
): Promise<Record<string, number>> {
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
