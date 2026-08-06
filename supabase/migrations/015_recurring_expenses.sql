-- =====================================================
-- 015: RECURRING EXPENSES
--
-- Recurring expense templates: org members and solo users
-- define a pattern (amount, frequency, start date) and the
-- app materializes due instances into `expenses` on page load
-- (no cron required). RLS mirrors the `expenses` policies so
-- the same audience can read/write.
--
-- Also extends the log_audit_event action vocabulary with
-- recurring.* + attachment.* actions used by the new features.
-- =====================================================

-- ------------------------------------------------------------------
-- 1. RECURRING EXPENSES TABLE
-- ------------------------------------------------------------------
CREATE TABLE public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 100),
  entry_type TEXT NOT NULL DEFAULT 'expense' CHECK (entry_type IN ('expense', 'income')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000000),
  currency TEXT NOT NULL DEFAULT 'USD',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_expenses_org ON public.recurring_expenses(org_id);
CREATE INDEX idx_recurring_expenses_user ON public.recurring_expenses(user_id);
CREATE INDEX idx_recurring_due_active ON public.recurring_expenses(is_active, next_due_date);

-- ------------------------------------------------------------------
-- 2. UPDATED_AT TRIGGER
-- ------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_recurring_expenses_updated_at ON public.recurring_expenses;
CREATE TRIGGER trg_recurring_expenses_updated_at
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------------
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with recurring expenses"
  ON public.recurring_expenses
  FOR ALL USING (public.is_super_admin());

-- Org members: org-wide view + manage (same audience as expenses).
CREATE POLICY "Org members can manage recurring expenses"
  ON public.recurring_expenses
  FOR ALL USING (
    public.is_org_member(org_id)
    AND public.can_write_in_org(org_id)
  );

-- Solo users: their own personal templates only.
CREATE POLICY "Solo users can manage own recurring expenses"
  ON public.recurring_expenses
  FOR ALL USING (
    public.is_solo_user()
    AND public.is_row_owner(user_id)
    AND org_id IS NULL
  );

-- ------------------------------------------------------------------
-- 4. EXTEND AUDIT VOCABULARY (recurring.* + attachment.*)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_org_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_audit_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF lower(p_action) NOT IN (
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
    'org.profile_update',
    'org.defaults_update',
    'org.status_change',
    'request.approve',
    'request.reject',
    'plan.price_update',
    'subscription.plan_change',
    'recurring.create',
    'recurring.update',
    'recurring.delete',
    'attachment.upload',
    'attachment.delete'
  ) THEN
    RAISE EXCEPTION 'Unknown audit action';
  END IF;

  IF p_org_id IS NOT NULL AND NOT public.can_admin_org(p_org_id) THEN
    RAISE EXCEPTION 'Not authorized to log for this organization';
  END IF;

  INSERT INTO public.audit_logs (org_id, user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (p_org_id, v_user_id, lower(p_action), p_entity_type, p_entity_id, p_old_value, p_new_value)
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(TEXT, UUID, TEXT, UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, UUID, TEXT, UUID, JSONB, JSONB) TO authenticated;
