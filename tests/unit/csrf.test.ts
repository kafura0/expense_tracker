import { describe, it, expect, vi, beforeEach } from 'vitest'

const { store } = vi.hoisted(() => {
  const store = new Map<string, string>()
  return { store }
})

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    set: (_name: string, value: string) => {
      store.set('csrf-token', value)
    },
    get: () => (store.has('csrf-token') ? { value: store.get('csrf-token') } : undefined),
  })),
}))

import { generateCSRFToken, validateCSRFToken, isStateChangingRequest } from '@/shared/lib/csrf'

describe('isStateChangingRequest', () => {
  it('flags state-changing methods', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(isStateChangingRequest(method)).toBe(true)
    }
  })

  it('does not flag safe methods', () => {
    for (const method of ['GET', 'OPTIONS', 'HEAD']) {
      expect(isStateChangingRequest(method)).toBe(false)
    }
  })

  it('is case-insensitive', () => {
    expect(isStateChangingRequest('post')).toBe(true)
  })
})

describe('generateCSRFToken / validateCSRFToken', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it('generates a token that validates successfully', async () => {
    const token = await generateCSRFToken()
    expect(token).toBeTruthy()
    expect(await validateCSRFToken(token)).toBe(true)
  })

  it('rejects a tampered token', async () => {
    const token = await generateCSRFToken()
    expect(await validateCSRFToken(token + 'x')).toBe(false)
  })

  it('rejects when no token was stored', async () => {
    expect(await validateCSRFToken('anything')).toBe(false)
  })
})
