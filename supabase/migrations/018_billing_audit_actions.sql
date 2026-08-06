-- 018_billing_audit_actions.sql
--
-- Widens the pinned audit-action vocabulary to include the new billing
-- workflow. `log_audit_event` (migration 013) re-creates the function; the
-- only change here is the extra action in the IN (...) guard. Must be applied
-- through the Supabase Management API (see AGENTS.md).

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
    'billing.subscription_cancelled'
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
