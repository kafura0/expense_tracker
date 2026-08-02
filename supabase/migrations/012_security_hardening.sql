-- =====================================================
-- 012: SECURITY HARDENING + ORG LIFE-CYCLE ENFORCEMENT
--
-- Fixes from the adversarial code review (2026-08-02):
--   CRITICAL: create_org_for_user / approve_client_request were
--     SECURITY DEFINER with PUBLIC EXECUTE and no authorization
--     check -> any caller could pass an arbitrary p_user_id and
--     hijack a victim's rows into an attacker-controlled org.
--   HIGH: invite acceptance was broken by RLS (the invitee is not
--     yet a member, so both the invite read and the org_members
--     insert are denied) and tokens were not bound to the invitee's
--     email.
--   HIGH: organizations.status was never enforced anywhere, so
--     suspending an org was decorative.
--   MEDIUM: plans had no write policy (admin Plans editor could
--     never save); exchange_rates client writes excluded solo
--     users; no unique constraint on pending invites.
-- =====================================================

-- ------------------------------------------------------------------
-- 1. RPC authorization guards
-- ------------------------------------------------------------------

-- create_org_for_user: a caller may only create an org for THEMSELVES
-- unless they are a platform super admin (admin approve flow). The
-- function also refuses to run for a user who already belongs to an
-- organization (blocks duplicate-org spam and data hijack).
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
  UPDATE public.settings SET org_id = v_org_id WHERE user_id = p_user_id;

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- approve_client_request: platform super admins only.
CREATE OR REPLACE FUNCTION public.approve_client_request(
  p_request_id UUID,
  p_reviewer_id UUID,
  p_manager_id UUID,
  p_plan_slug TEXT DEFAULT 'free'
)
RETURNS UUID AS $$
DECLARE
  v_request RECORD;
  v_org_id UUID;
  v_user_id UUID;
  v_slug TEXT;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get the request
  SELECT * INTO v_request FROM public.client_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request already reviewed';
  END IF;

  -- Update request status
  UPDATE public.client_requests
  SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = now()
  WHERE id = p_request_id;

  -- Find the user by email (case-insensitive)
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_request.email);
  IF v_user_id IS NULL THEN
    -- User doesn't exist yet - they need to sign up first
    RETURN NULL;
  END IF;

  -- Slugify consistently with the app, with a fallback for non-Latin names
  v_slug := lower(regexp_replace(v_request.business_name OR v_request.name, '[^a-z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');
  IF v_slug = '' THEN
    v_slug := 'org-' || substr(md5(random()::text), 1, 8);
  END IF;

  -- Create org for this client
  v_org_id := public.create_org_for_user(
    v_request.business_name OR v_request.name,
    v_slug,
    v_user_id,
    p_plan_slug
  );

  -- Add the requested team member to the new org
  IF p_manager_id IS NOT NULL THEN
    INSERT INTO public.org_members (org_id, user_id, role)
    VALUES (v_org_id, p_manager_id, 'member')
    ON CONFLICT (org_id, user_id) DO NOTHING;
  END IF;

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Both business RPCs must only be callable by authenticated sessions,
-- never by anon / public clients.
REVOKE EXECUTE ON FUNCTION public.create_org_for_user(TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_client_request(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_org_for_user(TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_client_request(UUID, UUID, UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------
-- 2. Organization status enforcement (suspension / cancellation)
--
-- is_org_member / can_write_in_org now require the org to be active,
-- so suspending an org immediately revokes every member's access at
-- the RLS layer. is_super_admin intentionally does NOT check status:
-- platform staff must remain able to manage the platform.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members m
    JOIN public.organizations o ON o.id = m.org_id
    WHERE m.user_id = auth.uid()
      AND m.org_id = target_org_id
      AND o.status = 'active'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_write_in_org(target_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members m
    JOIN public.organizations o ON o.id = m.org_id
    WHERE m.user_id = auth.uid()
      AND m.org_id = target_org_id
      AND o.status = 'active'
  );
END;
$function$;

-- ------------------------------------------------------------------
-- 3. Invite acceptance (functional + security)
--
-- The invitee is NOT yet a member, so neither the invites read policy
-- nor the org_members insert policy (both membership-gated) can apply.
-- We add a read policy keyed on the invitee's JWT email plus an
-- atomic, email-bound SECURITY DEFINER accept_invite(p_token) RPC that
-- performs the membership insert + data reassignment + status flip.
-- ------------------------------------------------------------------

-- Invitees can view their own pending invite (needed by the /invite page).
DROP POLICY IF EXISTS "Invitees can view their pending invite" ON public.invites;
CREATE POLICY "Invitees can view their pending invite" ON public.invites
  FOR SELECT USING (
    status = 'pending'
    AND email = auth.jwt()->>'email'
  );

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
  UPDATE public.expense_settings SET org_id = v_invite.org_id WHERE user_id = auth.uid() AND org_id IS NULL;

  UPDATE public.invites
  SET status = 'accepted', accepted_by = auth.uid()
  WHERE id = v_invite.id;

  RETURN v_invite.org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.accept_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

-- Prevent duplicate pending invites for the same (org, email).
CREATE UNIQUE INDEX IF NOT EXISTS invites_pending_org_email_idx
  ON public.invites (org_id, lower(email))
  WHERE status = 'pending';

-- ------------------------------------------------------------------
-- 4. Plans: super admins can manage plans (previously SELECT-only, so
--    the admin Plans editor could never update a plan).
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can manage plans" ON public.plans;
CREATE POLICY "Super admins can manage plans" ON public.plans
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------
-- 5. Exchange-rate cache writes are removed from the client path.
--    Client writes previously let any org member corrupt the shared
--    reference rates (and excluded solo users entirely). The /api/rates
--    route now persists the cache server-side via the service role
--    (RLS-bypassed), so writes require no client policy at all.
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Org members can insert exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Org members can update exchange rates" ON exchange_rates;
