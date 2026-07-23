import { createClient } from '@/shared/lib/supabase/server'

export type AuditAction = 
  | 'user.login'
  | 'user.logout'
  | 'user.password_reset'
  | 'user.password_update'
  | 'expense.create'
  | 'expense.update'
  | 'expense.delete'
  | 'expense.restore'
  | 'expense.duplicate'
  | 'settings.update'
  | 'export.csv'
  | 'export.pdf'

interface AuditLogEntry {
  action: AuditAction
  user_id?: string
  resource_type?: string
  resource_id?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

/**
 * Log an audit event to the database
 * 
 * This function is designed to be non-blocking - it logs asynchronously
 * and never throws errors that would break the user's workflow.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Get current user if not provided
    let userId = entry.user_id
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }

    // Insert audit log (this table should have RLS disabled for inserts)
    // or use a service role client for audit logging
    await supabase.from('audit_logs').insert({
      action: entry.action,
      user_id: userId,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      metadata: entry.metadata,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    // Audit logging should never fail the main operation
    // Log to console in development, use a monitoring service in production
    console.error('Audit log failed:', error)
  }
}

/**
 * Create an audit logger with pre-filled context
 */
export function createAuditLogger(context: {
  ip_address?: string
  user_agent?: string
}) {
  return {
    log: (action: AuditAction, details?: Omit<AuditLogEntry, 'action' | 'ip_address' | 'user_agent'>) => {
      return logAuditEvent({
        action,
        ...context,
        ...details,
      })
    },
  }
}

/**
 * SQL to create the audit_logs table in Supabase
 * Run this in the SQL Editor if the table doesn't exist
 */
export const AUDIT_LOGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS but allow inserts from authenticated users (for their own logs)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own audit logs
CREATE POLICY "Users can read own audit logs" ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
`
