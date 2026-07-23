import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase client
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock exchange rate service
vi.mock('@/entities/exchange-rate/service', () => ({
  getExchangeRates: vi.fn(),
}))

describe('Exchange Rate API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/rates', () => {
    it('should return 401 if user not authenticated', async () => {
      const { createClient } = await import('@/shared/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any)

      const { GET } = await import('@/app/api/rates/route')
      const request = new NextRequest('http://localhost:3000/api/rates?base=USD')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 400 for invalid base currency', async () => {
      const { createClient } = await import('@/shared/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        },
      } as any)

      const { GET } = await import('@/app/api/rates/route')
      const request = new NextRequest('http://localhost:3000/api/rates?base=INVALID')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid base currency')
    })

    it('should return 400 if no base currency provided', async () => {
      const { createClient } = await import('@/shared/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        },
      } as any)

      const { GET } = await import('@/app/api/rates/route')
      const request = new NextRequest('http://localhost:3000/api/rates')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid base currency')
    })

    it('should return exchange rates for valid base currency', async () => {
      const { createClient } = await import('@/shared/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        },
      } as any)

      const { getExchangeRates } = await import('@/entities/exchange-rate/service')
      const mockRates = {
        base: 'USD',
        rates: { EUR: 0.85, GBP: 0.73, KES: 150.5 },
        timestamp: new Date().toISOString(),
      }
      vi.mocked(getExchangeRates).mockResolvedValue(mockRates)

      const { GET } = await import('@/app/api/rates/route')
      const request = new NextRequest('http://localhost:3000/api/rates?base=USD')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toEqual(mockRates)
      expect(getExchangeRates).toHaveBeenCalledWith('USD')
    })

    it('should handle base currency case insensitively', async () => {
      const { createClient } = await import('@/shared/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        },
      } as any)

      const { getExchangeRates } = await import('@/entities/exchange-rate/service')
      vi.mocked(getExchangeRates).mockResolvedValue({ base: 'USD', rates: {} })

      const { GET } = await import('@/app/api/rates/route')
      const request = new NextRequest('http://localhost:3000/api/rates?base=usd')
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      expect(getExchangeRates).toHaveBeenCalledWith('USD')
    })

    it('should return 500 on service error', async () => {
      const { createClient } = await import('@/shared/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        },
      } as any)

      const { getExchangeRates } = await import('@/entities/exchange-rate/service')
      vi.mocked(getExchangeRates).mockRejectedValue(new Error('API timeout'))

      const { GET } = await import('@/app/api/rates/route')
      const request = new NextRequest('http://localhost:3000/api/rates?base=USD')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch exchange rates')
    })

    it('should support all valid currencies', async () => {
      const { createClient } = await import('@/shared/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        },
      } as any)

      const { getExchangeRates } = await import('@/entities/exchange-rate/service')
      vi.mocked(getExchangeRates).mockResolvedValue({ base: 'USD', rates: {} })

      const { GET } = await import('@/app/api/rates/route')
      const currencies = ['USD', 'EUR', 'GBP', 'KES', 'CAD', 'AUD', 'JPY']
      
      for (const currency of currencies) {
        const request = new NextRequest(`http://localhost:3000/api/rates?base=${currency}`)
        const response = await GET(request)
        expect(response.status).toBe(200)
      }
    })
  })
})
