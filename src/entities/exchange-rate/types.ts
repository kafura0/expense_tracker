export interface ExchangeRate {
  id: string
  base_currency: string
  target_currency: string
  rate: number
  fetched_at: string
  created_at: string
}

export interface ExchangeRateResponse {
  base: string
  date: string
  rates: Record<string, number>
}

export const SUPPORTED_CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]