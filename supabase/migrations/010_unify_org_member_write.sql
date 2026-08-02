-- =====================================================
-- 010: UNIFY ORG MEMBER WRITE ACCESS
--
-- Product decision: org roles are no longer differentiated
-- (manager/client removed at the product level). Every org
-- member can manage expenses, categories, budgets, settings,
-- and invite members. This relaxes can_write_in_org so the
-- existing FOR ALL policies (categories, budgets, settings,
-- expenses) apply to every member instead of only managers.
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_write_in_org(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = auth.uid() AND org_id = target_org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
