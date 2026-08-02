-- =====================================================
-- INCOME TRACKING & PUBLIC PLANS
-- Migration 007: entry_type on expenses, public plans read
-- =====================================================

-- =====================================================
-- 1. EXPENSES: add entry_type ('expense' | 'income')
-- =====================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'expense'
  CHECK (entry_type IN ('expense', 'income'));

CREATE INDEX IF NOT EXISTS idx_expenses_entry_type ON expenses(entry_type);

-- =====================================================
-- 2. PLANS: allow anonymous visitors to view pricing
-- (powers the public landing/pricing pages; RLS stays on)
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view plans" ON plans;
CREATE POLICY "Anyone can view plans" ON plans
  FOR SELECT USING (true);
