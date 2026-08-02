-- =====================================================
-- 011: REMOVE LEGACY ORG ROLES (manager / client)
--
-- Product decision: every organization member is a plain
-- 'member'. The only remaining role value is 'super_admin'
-- (platform staff). This migration physically removes the
-- manager/client role values from the database and drops
-- the now-redundant role column from invites (invites
-- always create plain members).
-- =====================================================

-- 1. Drop the legacy role check, then normalize existing memberships.
--    (Order matters: the old check rejects 'member', so it must go first.)
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE public.org_members ALTER COLUMN role SET DEFAULT 'member';

UPDATE public.org_members
SET role = 'member'
WHERE role IN ('manager', 'client');

-- 2. Tighten org_members role values
ALTER TABLE public.org_members
  ADD CONSTRAINT org_members_role_check CHECK (role IN ('super_admin', 'member'));

-- 3. Invites always create plain members — drop the role column
ALTER TABLE public.invites DROP COLUMN IF EXISTS role;

-- 4. create_org_for_user assigns 'member'
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

-- 5. approve_client_request assigns 'member'
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
  v_user_email TEXT;
BEGIN
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

  -- Find or create user by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_request.email;
  IF v_user_id IS NULL THEN
    -- User doesn't exist yet - they need to sign up first
    -- We mark the request as approved and they'll be assigned when they sign up
    RETURN NULL;
  END IF;

  -- Create org for this client
  v_org_id := public.create_org_for_user(
    v_request.business_name OR v_request.name,
    lower(replace(v_request.business_name OR v_request.name, ' ', '-')),
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

-- 6. Exchange-rate write access: any org member (was: any 'manager')
DROP POLICY IF EXISTS "Managers can insert exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Managers can update exchange rates" ON exchange_rates;

CREATE POLICY "Org members can insert exchange rates" ON exchange_rates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members can update exchange rates" ON exchange_rates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.org_members WHERE user_id = auth.uid())
  );
