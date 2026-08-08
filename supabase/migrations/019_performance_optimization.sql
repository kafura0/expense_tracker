-- Database Performance Optimization Migration
-- Run this in Supabase SQL Editor

-- ============================================================================
-- EXPENSES TABLE OPTIMIZATION
-- ============================================================================

-- Composite index for common query patterns (user's expenses sorted by date)
CREATE INDEX IF NOT EXISTS idx_expenses_user_date 
  ON expenses(user_id, date DESC);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_expenses_user_category 
  ON expenses(user_id, category_id);

-- Index for filtering by currency
CREATE INDEX IF NOT EXISTS idx_expenses_user_currency 
  ON expenses(user_id, currency);

-- Index for soft-deleted expenses (exclude from most queries)
CREATE INDEX IF NOT EXISTS idx_expenses_user_deleted 
  ON expenses(user_id, is_deleted) 
  WHERE is_deleted = false;

-- Index for tax-related queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_tax 
  ON expenses(user_id, tax_applicable) 
  WHERE tax_applicable = true;

-- Index for date range queries (dashboard analytics)
CREATE INDEX IF NOT EXISTS idx_expenses_user_date_range 
  ON expenses(user_id, date, amount_cents);

-- Index for created_at (for recent activity)
CREATE INDEX IF NOT EXISTS idx_expenses_user_created 
  ON expenses(user_id, created_at DESC);

-- ============================================================================
-- CATEGORIES TABLE OPTIMIZATION
-- ============================================================================

-- Index for user's categories
CREATE INDEX IF NOT EXISTS idx_categories_user 
  ON categories(user_id) 
  WHERE user_id IS NOT NULL;

-- Index for default categories
CREATE INDEX IF NOT EXISTS idx_categories_default 
  ON categories(is_default) 
  WHERE is_default = true;

-- ============================================================================
-- SETTINGS TABLE OPTIMIZATION
-- ============================================================================

-- Unique index for user settings (one settings row per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user 
  ON settings(user_id);

-- ============================================================================
-- EXCHANGE_RATES TABLE OPTIMIZATION
-- ============================================================================

-- Index for fetching rates by base currency
CREATE INDEX IF NOT EXISTS idx_exchange_rates_base 
  ON exchange_rates(base_currency, fetched_at DESC);

-- Index for checking cache freshness
CREATE INDEX IF NOT EXISTS idx_exchange_rates_freshness 
  ON exchange_rates(base_currency, target_currency, fetched_at DESC);

-- ============================================================================
-- ORG_MEMBERS TABLE OPTIMIZATION (if exists)
-- ============================================================================

-- Index for user's org memberships
CREATE INDEX IF NOT EXISTS idx_org_members_user 
  ON org_members(user_id);

-- Index for org's members
CREATE INDEX IF NOT EXISTS idx_org_members_org 
  ON org_members(org_id);

-- Composite unique index for org membership
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_org 
  ON org_members(user_id, org_id);

-- ============================================================================
-- AUDIT_LOGS TABLE (if using the audit logging feature)
-- ============================================================================

-- The audit_logs table is created by the audit-logger.ts file
-- These indexes are for optimal query performance

-- Index for user's audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date 
  ON audit_logs(user_id, created_at DESC);

-- Index for action-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date 
  ON audit_logs(action, created_at DESC);

-- ============================================================================
-- MAINTENANCE: Update table statistics
-- ============================================================================

-- Analyze tables to update query planner statistics
ANALYZE expenses;
ANALYZE categories;
ANALYZE settings;
ANALYZE exchange_rates;
