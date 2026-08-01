-- =====================================================
-- BUDGETS TABLE
-- Migration 006: Budgets, budget RLS, analytics helper
-- =====================================================

-- =====================================================
-- 1. BUDGETS TABLE
-- =====================================================
-- scope 'user': personal budget (solo -> org_id IS NULL,
--                org member -> org_id = their org).
-- scope 'org' : org-wide category budget visible to the whole org.
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'user' CHECK (scope IN ('user', 'org')),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- One budget per (scope, org, user, category). A plain UNIQUE constraint would
-- not deduplicate solo budgets because Postgres treats NULLs as distinct, so we
-- use a unique index over COALESCE(org_id, sentinel).
CREATE UNIQUE INDEX uq_budgets_scope_org_user_category
  ON budgets(scope, COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), user_id, category_id);

-- =====================================================
-- 2. INDEXES FOR BUDGETS
-- =====================================================

CREATE INDEX idx_budgets_scope_org ON budgets(scope, org_id);
CREATE INDEX idx_budgets_user ON budgets(user_id);
CREATE INDEX idx_budgets_category ON budgets(category_id);
CREATE INDEX idx_budgets_scope_user_org ON budgets(scope, user_id, org_id);

-- =====================================================
-- 3. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON budgets;
CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 4. RLS ON BUDGETS
-- =====================================================

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can do everything with budgets" ON budgets
  FOR ALL USING (public.is_super_admin());

-- Org members can view budgets tied to their org (both scopes)
CREATE POLICY "Org members can view budgets" ON budgets
  FOR SELECT USING (public.is_org_member(org_id));

-- Solo users can manage their own personal budgets
CREATE POLICY "Solo users can manage own budgets" ON budgets
  FOR ALL USING (
    public.is_solo_user()
    AND public.is_row_owner(user_id)
    AND org_id IS NULL
  );

-- Managers + org admins can manage budgets in their org
CREATE POLICY "Managers can manage budgets" ON budgets
  FOR ALL USING (
    public.is_org_member(org_id)
    AND public.can_write_in_org(org_id)
  );

-- Any user can manage their own personal budgets
CREATE POLICY "Users can manage own budgets" ON budgets
  FOR ALL USING (
    scope = 'user'
    AND public.is_row_owner(user_id)
    AND (org_id IS NULL OR public.is_org_member(org_id))
  );
