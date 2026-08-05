import { describe, it, expect } from 'vitest'
import { isTruthyEnv, FAIL_OPEN_HEADER, FAIL_OPEN_MODE } from '@/shared/lib/supabase/middleware'

describe('middleware fail-open/fail-closed config (D-05)', () => {
  it('parses truthy env values', () => {
    expect(isTruthyEnv('1')).toBe(true)
    expect(isTruthyEnv('true')).toBe(true)
    expect(isTruthyEnv('TRUE')).toBe(true)
    expect(isTruthyEnv('on')).toBe(true)
  })

  it('treats anything else as off', () => {
    expect(isTruthyEnv(undefined)).toBe(false)
    expect(isTruthyEnv('0')).toBe(false)
    expect(isTruthyEnv('false')).toBe(false)
    expect(isTruthyEnv('yes')).toBe(false)
    expect(isTruthyEnv('')).toBe(false)
  })

  it('exposes the fail-open observability header', () => {
    expect(FAIL_OPEN_HEADER).toBe('x-middleware-mode')
    expect(FAIL_OPEN_MODE).toBe('fail-open')
  })
})
