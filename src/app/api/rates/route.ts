import { NextRequest, NextResponse } from 'next/server'
import { getExchangeRates } from '@/entities/exchange-rate/service'
import { SUPPORTED_CURRENCIES } from '@/entities/exchange-rate/types'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const base = searchParams.get('base')?.toUpperCase()

  if (!base || !SUPPORTED_CURRENCIES.includes(base as any)) {
    return NextResponse.json(
      { error: `Invalid base currency. Supported: ${SUPPORTED_CURRENCIES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const rates = await getExchangeRates(base)
    return NextResponse.json(rates)
  } catch (error) {
    console.error('Error fetching rates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    )
  }
}