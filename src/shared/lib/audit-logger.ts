/**
 * @fileoverview Single audit-logging implementation for Ledgerly.
 *
 * Every application-level audit write goes through the SECURITY DEFINER
 * `log_audit_event` RPC shipped in migration 013. The RPC:
 *   - re-derives the actor from the session JWT (never trusts a client id)
 *   - enforces a pinned action vocabulary (must match AUDIT_ACTIONS below)
 *   - rejects org-scoped writes from users who cannot admin that org
 *
 * Direct `audit_logs` INSERT/UPDATE/DELETE are revoked from `authenticated`
 * and no RLS policy permits them, so this RPC is the ONLY app write path.
 * (The sole exception is the `invite.accept` row written atomically inside
 * the DB's `accept_invite` function, whose actor is a new `member`.)
 *
 * @see supabase/migrations/013_org_administration.sql
 */

import { createClient } from '@/shared/lib/supabase/server'

/** Pinned audit action vocabulary — MUST match the SQL list in migration 013. */
export const AUDIT_ACTIONS = [
  'user.login',
  'user.logout',
  'user.password_reset',
  'user.password_update',
  'expense.create',
  'expense.update',
  'expense.delete',
  'expense.restore',
  'expense.duplicate',
  'export.csv',
  'export.pdf',
  'settings.update',
  'member.add',
  'member.remove',
  'member.role_change',
  'invite.send',
  'invite.revoke',
  'invite.resend',
  'invite.accept',
  'recurring.create',
  'recurring.update',
  'recurring.delete',
  'attachment.upload',
  'attachment.delete',
  'org.profile_update',
  'org.defaults_update',
  'org.status_change',
  'request.approve',
  'request.reject',
  'plan.price_update',
  'subscription.plan_change',
  'billing.subscription_cancelled',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export interface AuditLogEntry {
  action: AuditAction
  /** Org the event belongs to; null for platform/solo events. */
  org_id?: string | null
  /** Canonical migration-002 entity type (e.g. 'org_member', 'invite'). */
  entity_type?: string | null
  entity_id?: string | null
  old_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
}

/**
 * Append an audit event via the `log_audit_event` RPC.
 *
 * Non-blocking by design: it never throws and never breaks the calling
 * workflow. Returns the generated audit row id (or null on failure).
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_action: entry.action,
      p_org_id: entry.org_id ?? null,
      p_entity_type: entry.entity_type ?? null,
      p_entity_id: entry.entity_id ?? null,
      p_old_value: entry.old_value ?? null,
      p_new_value: entry.new_value ?? null,
    })

    if (error) throw new Error(error.message)
    return (data as string | null) ?? null
  } catch (error) {
    // Audit logging must never fail the main operation
    console.error('Audit log failed:', error)
    return null
  }
}

/**
 * Create an audit logger with a pre-filled org context.
 */
export function createAuditLogger(context: { org_id?: string | null } = {}) {
  return {
    log: (action: AuditAction, details?: Omit<AuditLogEntry, 'action' | 'org_id'>) =>
      logAuditEvent({
        action,
        org_id: context.org_id ?? null,
        ...details,
      }),
  }
}

/**
 * Narrow type guard so callers holding a raw action string can check it
 * against the pinned vocabulary before logging.
 */
export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value)
}
