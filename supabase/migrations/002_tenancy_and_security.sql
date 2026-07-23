-- =====================================================
-- LEDGERLY MULTI-TENANCY & SECURITY HARDENING
-- Migration 002: Tenancy tables, org_id on existing
-- tables, RLS rewrite, plans, subscriptions, audit logs
-- =====================================================

-- =====================================================
-- 0. CLEAN SLATE: Clear existing data
-- =====================================================
-- Order matters due to foreign keys
TRUNCATE expenses CASCADE;
TRUNCATE categories CASCADE;
TRUNCATE settings CASCADE;
TRUNCATE profiles CASCADE;
TRUNCATE exchange_rates CASCADE;

-- =====================================================
-- 1. NEW TABLES: Tenancy & Monetization
-- =====================================================

-- Plans (subscription tiers)
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  max_members INTEGER NOT NULL DEFAULT 1,
  max_expenses_per_month INTEGER NOT NULL DEFAULT 50,
  features JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Organizations (tenants / clients)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Organization members (user-org mapping with roles)
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('super_admin', 'manager', 'client')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(org_id, user_id)
);

-- Client access requests
CREATE TABLE client_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Subscriptions (per-org billing)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'trialing', 'cancelled', 'expired', 'past_due')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Audit log (tracks all sensitive actions)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- 2. ADD org_id TO EXISTING TABLES
-- =====================================================

ALTER TABLE profiles ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE settings ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Fix settings unique constraint: was UNIQUE(user_id), now UNIQUE(user_id, org_id)
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_user_id_key;
ALTER TABLE settings ADD CONSTRAINT settings_user_id_org_id_unique UNIQUE (user_id, org_id);

-- =====================================================
-- 3. INDEXES
-- =====================================================

-- plans
CREATE INDEX idx_plans_slug ON plans(slug);

-- organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_created_by ON organizations(created_by);

-- org_members
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_org_members_role ON org_members(role);

-- client_requests
CREATE INDEX idx_client_requests_status ON client_requests(status);
CREATE INDEX idx_client_requests_email ON client_requests(email);

-- subscriptions
CREATE INDEX idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- audit_logs
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- org_id indexes on existing tables
CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_categories_org_id ON categories(org_id);
CREATE INDEX idx_expenses_org_id ON expenses(org_id);
CREATE INDEX idx_settings_org_id ON settings(org_id);

-- =====================================================
-- 4. HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Check if user is super_admin anywhere
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get all org_ids a user belongs to
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT org_id FROM public.org_members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is member of a specific org
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = auth.uid() AND org_id = target_org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's role in a specific org
CREATE OR REPLACE FUNCTION public.get_org_role(target_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.org_members
  WHERE user_id = auth.uid() AND org_id = target_org_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can write (manager or super_admin) in an org
CREATE OR REPLACE FUNCTION public.can_write_in_org(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = auth.uid() AND org_id = target_org_id
    AND role IN ('super_admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 5. RLS POLICIES (DROP OLD, CREATE NEW)
-- =====================================================

-- Disable RLS temporarily for alterations
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

DROP POLICY IF EXISTS "Users can view own settings" ON settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON settings;
DROP POLICY IF EXISTS "Users can update own settings" ON settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON settings;

DROP POLICY IF EXISTS "Authenticated users can view exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Authenticated users can insert exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Authenticated users can update exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Authenticated users can delete exchange rates" ON exchange_rates;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. NEW RLS POLICIES
-- =====================================================

-- ---- PLANS (read-only for all authenticated users) ----
CREATE POLICY "Authenticated users can view plans" ON plans
  FOR SELECT USING (auth.role() = 'authenticated');

-- ---- ORGANIZATIONS ----
CREATE POLICY "Super admins can do everything with organizations" ON organizations
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Org members can view their organization" ON organizations
  FOR SELECT USING (public.is_org_member(id));

-- ---- ORG_MEMBERS ----
CREATE POLICY "Super admins can do everything with org_members" ON org_members
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Org members can view members of their org" ON org_members
  FOR SELECT USING (public.is_org_member(org_id));

CREATE POLICY "Managers can manage members in their org" ON org_members
  FOR ALL USING (public.can_write_in_org(org_id));

-- ---- CLIENT_REQUESTS ----
CREATE POLICY "Super admins can do everything with client_requests" ON client_requests
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Anyone can insert client_requests" ON client_requests
  FOR INSERT WITH CHECK (true);

-- ---- SUBSCRIPTIONS ----
CREATE POLICY "Super admins can do everything with subscriptions" ON subscriptions
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Org members can view their subscription" ON subscriptions
  FOR SELECT USING (public.is_org_member(org_id));

-- ---- PROFILES ----
CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Org members can view profiles in their org" ON profiles
  FOR SELECT USING (public.is_org_member(org_id));

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id OR public.can_write_in_org(org_id));

CREATE POLICY "Super admins can delete any profile" ON profiles
  FOR DELETE USING (public.is_super_admin());

-- ---- CATEGORIES ----
CREATE POLICY "Super admins can do everything with categories" ON categories
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Managers can manage categories in their org" ON categories
  FOR ALL USING (public.can_write_in_org(org_id));

CREATE POLICY "Clients can view categories in their org" ON categories
  FOR SELECT USING (public.is_org_member(org_id));

-- ---- EXPENSES ----
CREATE POLICY "Super admins can do everything with expenses" ON expenses
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Managers can manage expenses in their org" ON expenses
  FOR ALL USING (public.can_write_in_org(org_id));

CREATE POLICY "Clients can view expenses in their org" ON expenses
  FOR SELECT USING (public.is_org_member(org_id));

-- ---- SETTINGS ----
CREATE POLICY "Super admins can do everything with settings" ON settings
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Managers can manage settings in their org" ON settings
  FOR ALL USING (public.can_write_in_org(org_id));

CREATE POLICY "Clients can view settings in their org" ON settings
  FOR SELECT USING (public.is_org_member(org_id));

-- ---- EXCHANGE RATES (read for all authenticated, admin-managed writes) ----
CREATE POLICY "Authenticated users can view exchange rates" ON exchange_rates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can manage exchange rates" ON exchange_rates
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Managers can insert exchange rates" ON exchange_rates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers can update exchange rates" ON exchange_rates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- ---- AUDIT_LOGS ----
CREATE POLICY "Super admins can do everything with audit_logs" ON audit_logs
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Org members can view audit logs for their org" ON audit_logs
  FOR SELECT USING (public.is_org_member(org_id));

-- =====================================================
-- 7. SEED DEFAULT PLANS
-- =====================================================

INSERT INTO plans (name, slug, price_monthly_cents, price_yearly_cents, max_members, max_expenses_per_month, features) VALUES
  ('Free', 'free', 0, 0, 1, 50, '{"export_csv": true, "export_pdf": false, "multi_currency": false, "insights": false, "api_access": false}'),
  ('Pro', 'pro', 999, 9990, 10, -1, '{"export_csv": true, "export_pdf": true, "multi_currency": true, "insights": true, "api_access": false}'),
  ('Enterprise', 'enterprise', 2999, 29990, -1, -1, '{"export_csv": true, "export_pdf": true, "multi_currency": true, "insights": true, "api_access": true}');

-- =====================================================
-- 8. UPDATE TRIGGER for handle_new_user
-- The trigger still creates profile on signup, but now
-- the org assignment is handled by super admin flow.
-- We also need to create a default org for the first
-- super admin (admin@ledgerly.app).
-- =====================================================

-- Updated trigger: creates profile only (org assignment is separate)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile (org_id set later when super admin assigns)
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  -- Create default settings (org_id set later)
  INSERT INTO public.settings (user_id)
  VALUES (NEW.id);

  -- Create default categories (org_id set later)
  INSERT INTO public.categories (user_id, name, icon, color) VALUES
    (NEW.id, 'Meals & Entertainment', 'utensils', '#FF6B6B'),
    (NEW.id, 'Transport', 'car', '#4ECDC4'),
    (NEW.id, 'Housing', 'home', '#45B7D1'),
    (NEW.id, 'Utilities', 'zap', '#96CEB4'),
    (NEW.id, 'Shopping', 'shopping-bag', '#FFEAA7'),
    (NEW.id, 'Health', 'heart', '#DDA0DD'),
    (NEW.id, 'Education', 'book', '#98D8C8'),
    (NEW.id, 'Other', 'more-horizontal', '#C9C9C9');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. HELPER: Create org + assign user (used by super admin)
-- =====================================================

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

  -- Assign user as manager
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'manager');

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

-- =====================================================
-- 10. HELPER: Approve client request
-- =====================================================

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

  -- Assign money manager
  IF p_manager_id IS NOT NULL THEN
    INSERT INTO public.org_members (org_id, user_id, role)
    VALUES (v_org_id, p_manager_id, 'manager')
    ON CONFLICT (org_id, user_id) DO NOTHING;
  END IF;

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
