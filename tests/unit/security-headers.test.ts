import { describe, it, expect } from 'vitest'
import { NextResponse } from 'next/server'
import { buildCsp, addSecurityHeaders } from '@/shared/lib/security-headers'

describe('buildCsp', () => {
  it('includes the nonce in script-src', () => {
    expect(buildCsp('abc123', false)).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'")
  })

  it('adds unsafe-eval only in development', () => {
    expect(buildCsp('n', true)).toContain("'unsafe-eval'")
    expect(buildCsp('n', false)).not.toContain("'unsafe-eval'")
  })

  it('sets deny-by-default directives', () => {
    const csp = buildCsp('n', false)
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
  })
})

describe('addSecurityHeaders', () => {
  it('sets the CSP header when a nonce is provided', () => {
    const response = addSecurityHeaders(NextResponse.next(), { nonce: 'n1' })
    expect(response.headers.get('Content-Security-Policy')).toContain('nonce-n1')
  })

  it('skips CSP when no nonce is provided', () => {
    const response = addSecurityHeaders(NextResponse.next())
    expect(response.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('always sets the other security headers', () => {
    const response = addSecurityHeaders(NextResponse.next())
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('Permissions-Policy')).toContain('camera=()')
    expect(response.headers.get('X-Powered-By')).toBeNull()
  })
})
