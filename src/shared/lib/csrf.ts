import { cookies } from 'next/headers'
import { createHmac, randomBytes } from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fallback-csrf-secret'
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour

interface CSRFTokenPayload {
  token: string
  expires: number
}

/**
 * Generate a CSRF token for form submissions
 */
export async function generateCSRFToken(): Promise<string> {
  const payload: CSRFTokenPayload = {
    token: randomBytes(32).toString('hex'),
    expires: Date.now() + CSRF_TOKEN_EXPIRY,
  }

  const signature = createHmac('sha256', CSRF_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex')

  const cookieStore = await cookies()
  cookieStore.set('csrf-token', JSON.stringify({ ...payload, signature }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CSRF_TOKEN_EXPIRY / 1000,
    path: '/',
  })

  return payload.token
}

/**
 * Validate a CSRF token from form submission
 */
export async function validateCSRFToken(token: string): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const storedData = cookieStore.get('csrf-token')?.value

    if (!storedData) {
      return false
    }

    const parsed = JSON.parse(storedData)
    const { signature, ...payload } = parsed

    // Verify signature
    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex')

    if (signature !== expectedSignature) {
      return false
    }

    // Check expiry
    if (Date.now() > payload.expires) {
      return false
    }

    // Verify token matches
    return payload.token === token
  } catch {
    return false
  }
}

/**
 * Middleware helper to check CSRF for state-changing requests
 */
export function isStateChangingRequest(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
}
