-- =====================================================
-- 013: ORG ADMINISTRATION FOUNDATION (FR-30..FR-34)
--
-- Lands the primitives later epics build on:
--   1. can_admin_org() helper + org_admin role value
--   2. RLS escalation close on org_members / invites
--   3. Corrected, atomic accept_invite (settings merge)
--   4. Single tamper-evident audit logging RPC
--   5. First-admin backfill for existing organizations
--   6. Org-wide defaults columns (currency / VAT)
--   7. plans.updated_at (fixes updatePlan write failure)
--
-- MUST be applied via the Management API (never `supabase db push`).
-- =====================================================

-- ------------------------------------------------------------------
-- 1. ROLE MODEL: add 'org_admin' to org_members.role
-- ------------------------------------------------------------------
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE public.org_members
  ADD CONSTRAINT org_members_role_check CHECK (role IN ('super_admin', 'org_admin', 'member'));

-- ------------------------------------------------------------------
-- 2. can_admin_org() — org-administration boundary (FR-32, AD-4)
--
-- SECURITY DEFINER STABLE helper. True when the caller is a platform
-- super_admin (may administer any org, regardless of status), OR an
-- org_admin of the target ACTIVE org. Does NOT grant /admin.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_admin_org(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  IF target_org_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = target_org_id
      AND (
        public.is_super_admin()
        OR (
          o.status = 'active'
          AND EXISTS (
            SELECT 1 FROM public.org_members m
            WHERE m.user_id = auth.uid()
              AND m.org_id = o.id
              AND m.role = 'org_admin'
          )
        )
      )
  );
END;
$function$;

-- ------------------------------------------------------------------
-- 3. LAST-ORG-ADMIN GUARD (FR-6)
--
-- DB-level invariant: an organization always keeps at least one
-- org_admin. Demoting or removing the last remaining Org Admin is
-- refused regardless of who performs it.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.preserve_last_org_admin()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_count INTEGER;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.role = 'org_admin' THEN
    SELECT count(*) INTO v_admin_count
    FROM public.org_members
    WHERE org_id = OLD.org_id AND role = 'org_admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote or remove the last Org Admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS preserve_last_org_admin ON public.org_members;
CREATE TRIGGER preserve_last_org_admin
  BEFORE UPDATE OR DELETE ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION public.preserve_last_org_admin();

-- ------------------------------------------------------------------
-- 4. ORG_MEMBERS RLS: close the uniform-write escalation (FR-31)
--
-- Replace the legacy "Managers can manage members" (can_write_in_org)
-- policy with a can_admin_org-gated policy. A member can no longer
-- INSERT/UPDATE/DELETE roster rows, and no non-super-admin can reach
-- role='super_admin' by self-insertion.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Managers can manage members in their org" ON public.org_members;
CREATE POLICY "Org admins can manage members in their org" ON public.org_members
  FOR ALL
  USING (public.can_admin_org(org_id))
  WITH CHECK (
    public.can_admin_org(org_id)
    AND (role <> 'super_admin' OR public.is_super_admin())
  );

-- ------------------------------------------------------------------
-- 5. INVITES RLS: close the uniform-write escalation (FR-31)
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Org managers can manage invites" ON public.invites;
CREATE POLICY "Org admins can manage invites" ON public.invites
  FOR ALL
  USING (public.can_admin_org(org_id))
  WITH CHECK (public.can_admin_org(org_id));

-- Invitees can read their OWN invite by token across statuses (pending,
-- expired, revoked, accepted) so the /invite page can show distinct
-- states (FR-16). Bound to the JWT email — never a bare token lookup.
DROP POLICY IF EXISTS "Invitees can view their pending invite" ON public.invites;
CREATE POLICY "Invitees can view their invite by token" ON public.invites
  FOR SELECT USING (
    email = auth.jwt()->>'email'
  );

-- ------------------------------------------------------------------
-- 6. CORRECTED ATOMIC accept_invite (FR-30, FR-13, AD-5)
--
-- Fixes: settings write targets `settings` (never the nonexistent
-- `expense_settings`); membership insert, row migration, and status
-- flip commit in one transaction; re-joiners do not violate the
-- settings UNIQUE(user_id, org_id) constraint (per-field merge).
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS UUID AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite
  FROM public.invites
  WHERE token = p_token AND status = 'pending'
  LIMIT 1;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found or expired';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    UPDATE public.invites SET status = 'expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  -- Bind the token to the invitee's email (case-insensitive)
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  IF v_user_email IS NULL OR lower(v_user_email) <> lower(v_invite.email) THEN
    RAISE EXCEPTION 'This invite is not for your account';
  END IF;

  -- Single membership, no duplicates
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_invite.org_id, auth.uid(), 'member')
  ON CONFLICT (org_id, user_id) DO NOTHING;

  -- Reassign the user's personal rows that are not yet org-bound
  UPDATE public.profiles SET org_id = v_invite.org_id WHERE user_id = auth.uid() AND org_id IS NULL;
  UPDATE public.categories SET org_id = v_invite.org_id WHERE user_id = auth.uid() AND org_id IS NULL;
  UPDATE public.expenses SET org_id = v_invite.org_id WHERE user_id = auth.uid() AND org_id IS NULL;

  -- Settings merge: migrate the solo row into the org scope, merging
  -- per-field when a settings row for this org already exists (re-join).
  INSERT INTO public.settings (user_id, org_id, base_currency, vat_rate, theme)
  SELECT user_id, v_invite.org_id, base_currency, vat_rate, theme
  FROM public.settings
  WHERE user_id = auth.uid() AND org_id IS NULL
  ON CONFLICT (user_id, org_id) DO UPDATE SET
    base_currency = EXCLUDED.base_currency,
    vat_rate = EXCLUDED.vat_rate,
    theme = EXCLUDED.theme,
    updated_at = now();

  UPDATE public.invites
  SET status = 'accepted', accepted_by = auth.uid()
  WHERE id = v_invite.id;

  -- Record the join atomically. The invitee is not yet an org_admin, so
  -- this is the one org-scoped audit write that must happen inside the DB
  -- (SECURITY DEFINER) rather than via the log_audit_event RPC, whose
  -- can_admin_org gate members cannot satisfy. The actor guard trigger
  -- still attributes the row to auth.uid().
  INSERT INTO public.audit_logs (org_id, user_id, action, entity_type, entity_id)
  VALUES (v_invite.org_id, auth.uid(), 'invite.accept', 'invite', v_invite.id);

  RETURN v_invite.org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.accept_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

-- ------------------------------------------------------------------
-- 7. create_org_for_user: hardening + settings merge
--    (settings UPDATE could violate UNIQUE(user_id, org_id) for a
--    user who has leftover org-scoped rows; migrate NULL rows instead)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_org_for_user(
  p_org_name TEXT,
  p_org_slug TEXT,
  p_user_id UUID,
  p_plan_slug TEXT DEFAULT 'free'
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_plan_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id <> auth.uid() AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.org_members WHERE user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  -- Create the organization
  INSERT INTO public.organizations (name, slug, created_by, status)
  VALUES (p_org_name, p_org_slug, p_user_id, 'active')
  RETURNING id INTO v_org_id;

  -- Assign user as member
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'member');

  -- Create subscription with the specified plan
  SELECT id INTO v_plan_id FROM public.plans WHERE slug = p_plan_slug;
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id FROM public.plans WHERE slug = 'free';
  END IF;

  INSERT INTO public.subscriptions (org_id, plan_id, status, current_period_start, current_period_end)
  VALUES (
    v_org_id,
    v_plan_id,
    'active',
    now(),
    now() + INTERVAL '30 days'
  );

  -- Update existing data to belong to this org
  UPDATE public.profiles SET org_id = v_org_id WHERE user_id = p_user_id;
  UPDATE public.categories SET org_id = v_org_id WHERE user_id = p_user_id;
  UPDATE public.expenses SET org_id = v_org_id WHERE user_id = p_user_id;

  -- Settings: migrate the solo row into the org scope (per-field merge)
  INSERT INTO public.settings (user_id, org_id, base_currency, vat_rate, theme)
  SELECT user_id, v_org_id, base_currency, vat_rate, theme
  FROM public.settings
  WHERE user_id = p_user_id AND org_id IS NULL
  ON CONFLICT (user_id, org_id) DO UPDATE SET
    base_currency = EXCLUDED.base_currency,
    vat_rate = EXCLUDED.vat_rate,
    theme = EXCLUDED.theme,
    updated_at = now();

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.create_org_for_user(TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_org_for_user(TEXT, TEXT, UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------
-- 8. SINGLE TAMPER-EVIDENT AUDIT LOGGING RPC (FR-27, FR-33, AD-6)
--
--    - SECURITY DEFINER, insert-only
--    - re-derives the actor server-side (never trusts a client id)
--    - enforces the pinned action vocabulary
--    - org-scoped entries require can_admin_org(org_id)
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
    'subscription.plan_change'
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

-- Actor re-derivation guard: a direct write can never attribute a row
-- to anyone but the session actor.
CREATE OR REPLACE FUNCTION public.audit_log_actor_guard()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_log_actor_guard ON public.audit_logs;
CREATE TRIGGER audit_log_actor_guard
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_actor_guard();

-- ------------------------------------------------------------------
-- 9. AUDIT_LOGS RLS: append-only, scoped reads (FR-29, FR-33)
--
--    - reads: super_admin (all) OR org_admin (own-org rows only)
--    - writes: none via PostgREST (RLS + revoked privileges); the
--      only write path is the log_audit_event RPC
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can do everything with audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Org members can view audit logs for their org" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can read own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Super admins and org admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_super_admin() OR public.can_admin_org(org_id));

REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon;

-- Composite index for the audit browse surface (NFR-3)
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_action_org_created
  ON public.audit_logs (user_id, action, org_id, created_at DESC);

-- ------------------------------------------------------------------
-- 10. FIRST-ADMIN BACKFILL (FR-34)
--
--     Promote the earliest-created_at member to org_admin in every
--     existing organization. Idempotent: already-promoted rows are
--     skipped, so re-running never duplicates promotions.
-- ------------------------------------------------------------------
UPDATE public.org_members m
SET role = 'org_admin'
FROM (
  SELECT DISTINCT ON (org_id) id, org_id
  FROM public.org_members
  WHERE role <> 'super_admin'
  ORDER BY org_id, created_at ASC, id ASC
) first_admin
WHERE m.id = first_admin.id
  AND m.role = 'member';

-- ------------------------------------------------------------------
-- 11. ORG-WIDE DEFAULTS COLUMNS (FR-18, AD-8)
-- ------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_currency TEXT,
  ADD COLUMN IF NOT EXISTS default_vat_rate NUMERIC(5,2);

-- ------------------------------------------------------------------
-- 12. PLANS.updated_at (fixes updatePlan writing a missing column)
-- ------------------------------------------------------------------
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;

-- ------------------------------------------------------------------
-- 13. INVITE DELIVERY TRACKING (FR-12, AD-7, NFR-5)
--
--     send_id/last_sent_at correlate the outbound email to the invite
--     row for delivery diagnosis.
-- ------------------------------------------------------------------
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS send_id TEXT,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;

-- ------------------------------------------------------------------
-- 14. ORG SETTINGS WRITE ACCESS + NULLABLE OVERRIDES (FR-17..20, AD-8)
--
--     - org_admins (via can_admin_org) may UPDATE their own org's
--       profile and default_currency / default_vat_rate columns;
--       members keep SELECT (existing policy).
--     - settings.base_currency / vat_rate become nullable so a NULL
--       value means "inherit the org default" (per-field override can
--       be cleared, FR-19).
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Org admins can update their organization" ON public.organizations;
CREATE POLICY "Org admins can update their organization" ON public.organizations
  FOR UPDATE
  USING (public.can_admin_org(id))
  WITH CHECK (public.can_admin_org(id));

ALTER TABLE public.settings
  ALTER COLUMN base_currency DROP NOT NULL,
  ALTER COLUMN vat_rate DROP NOT NULL;
