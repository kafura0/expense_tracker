import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AUDIT_ACTIONS,
  isAuditAction,
  createAuditLogger,
  logAuditEvent,
} from '@/shared/lib/audit-logger'

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const { createClient } = await import('@/shared/lib/supabase/server')

const rpc = vi.fn()

describe('AUDIT_ACTIONS vocabulary', () => {
  it('is pinned and non-empty', () => {
    expect(AUDIT_ACTIONS.length).toBeGreaterThan(10)
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length)
  })

  it('contains the documented core actions', () => {
    expect(AUDIT_ACTIONS).toContain('expense.create')
    expect(AUDIT_ACTIONS).toContain('invite.send')
    expect(AUDIT_ACTIONS).toContain('member.add')
  })
})

describe('isAuditAction', () => {
  it('returns true for pinned actions', () => {
    expect(isAuditAction('expense.delete')).toBe(true)
  })

  it('returns false for unknown actions', () => {
    expect(isAuditAction('not.an.action')).toBe(false)
  })
})

describe('logAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc })
    rpc.mockResolvedValue({ data: 'row-id', error: null })
  })

  it('calls the RPC with the full payload and returns the id', async () => {
    const id = await logAuditEvent({
      action: 'expense.create',
      org_id: 'org-1',
      entity_type: 'expense',
      entity_id: 'exp-1',
      new_value: { amount_cents: 100 },
    })
    expect(id).toBe('row-id')
    expect(rpc).toHaveBeenCalledWith('log_audit_event', {
      p_action: 'expense.create',
      p_org_id: 'org-1',
      p_entity_type: 'expense',
      p_entity_id: 'exp-1',
      p_old_value: null,
      p_new_value: { amount_cents: 100 },
    })
  })

  it('returns null when the RPC errors (never throws)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'denied' } })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const id = await logAuditEvent({ action: 'expense.create' })
    expect(id).toBeNull()
    spy.mockRestore()
  })

  it('returns null when the RPC rejects (never throws)', async () => {
    rpc.mockRejectedValue(new Error('boom'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const id = await logAuditEvent({ action: 'expense.create' })
    expect(id).toBeNull()
    spy.mockRestore()
  })
})

describe('createAuditLogger', () => {
  it('pre-fills the org context on every log', async () => {
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc })
    rpc.mockResolvedValue({ data: null, error: null })
    const logger = createAuditLogger({ org_id: 'org-9' })
    await logger.log('member.remove', { entity_id: 'u-1' })
    expect(rpc).toHaveBeenCalledWith('log_audit_event', expect.objectContaining({
      p_org_id: 'org-9',
      p_entity_id: 'u-1',
    }))
  })
})
