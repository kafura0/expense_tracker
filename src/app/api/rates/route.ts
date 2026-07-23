import { NextRequest, NextResponse } from 'next/server'
import { getExchangeRates } from '@/entities/exchange-rate/service'
import { SUPPORTED_CURRENCIES } from '@/entities/exchange-rate/types'
import { createClient } from '@/shared/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verify authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const base = searchParams.get('base')?.toUpperCase()

  if (!base || !SUPPORTED_CURRENCIES.includes(base as typeof SUPPORTED_CURRENCIES[number])) {
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
