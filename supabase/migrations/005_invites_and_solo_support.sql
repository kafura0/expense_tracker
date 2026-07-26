-- =====================================================
-- INVITES TABLE & SOLO USER SUPPORT
-- Migration 005: Invites, solo user RLS, helper functions
-- =====================================================

-- =====================================================
-- 1. INVITES TABLE
-- =====================================================

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('manager', 'client')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- 2. INDEXES FOR INVITES
-- =====================================================

CREATE INDEX idx_invites_org_id ON invites(org_id);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_status ON invites(status);

-- =====================================================
-- 3. ENABLE RLS ON INVITES
-- =====================================================

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can do everything with invites" ON invites
  FOR ALL USING (public.is_super_admin());

-- Org managers can manage invites in their org
CREATE POLICY "Org managers can manage invites" ON invites
  FOR ALL USING (public.can_write_in_org(org_id));

-- Org members can view invites in their org
CREATE POLICY "Org members can view invites in their org" ON invites
  FOR SELECT USING (public.is_org_member(org_id));

-- =====================================================
-- 4. HELPER FUNCTIONS FOR SOLO USERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_solo_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.org_members WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_row_owner(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 5. RLS POLICIES: EXPENSES (solo user support)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can do everything with expenses" ON expenses;
DROP POLICY IF EXISTS "Managers can manage expenses in their org" ON expenses;
DROP POLICY IF EXISTS "Clients can view expenses in their org" ON expenses;

-- Recreate with solo user support
CREATE POLICY "Super admins can do everything with expenses" ON expenses
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Org managers can manage expenses" ON expenses
  FOR ALL USING (public.is_org_member(org_id) AND public.can_write_in_org(org_id));

CREATE POLICY "Org clients can view expenses" ON expenses
  FOR SELECT USING (public.is_org_member(org_id));

CREATE POLICY "Solo users can manage their own expenses" ON expenses
  FOR ALL USING (public.is_solo_user() AND public.is_row_owner(user_id) AND org_id IS NULL);

-- =====================================================
-- 6. RLS POLICIES: CATEGORIES (solo user support)
-- =====================================================

DROP POLICY IF EXISTS "Super admins can do everything with categories" ON categories;
DROP POLICY IF EXISTS "Managers can manage categories in their org" ON categories;
DROP POLICY IF EXISTS "Clients can view categories in their org" ON categories;

CREATE POLICY "Super admins can do everything with categories" ON categories
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Org managers can manage categories" ON categories
  FOR ALL USING (public.is_org_member(org_id) AND public.can_write_in_org(org_id));

CREATE POLICY "Org clients can view categories" ON categories
  FOR SELECT USING (public.is_org_member(org_id));

CREATE POLICY "Solo users can manage their own categories" ON categories
  FOR ALL USING (public.is_solo_user() AND public.is_row_owner(user_id) AND org_id IS NULL);

-- =====================================================
-- 7. RLS POLICIES: SETTINGS (solo user support)
-- =====================================================

DROP POLICY IF EXISTS "Super admins can do everything with settings" ON settings;
DROP POLICY IF EXISTS "Managers can manage settings in their org" ON settings;
DROP POLICY IF EXISTS "Clients can view settings in their org" ON settings;

CREATE POLICY "Super admins can do everything with settings" ON settings
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Org managers can manage settings" ON settings
  FOR ALL USING (public.is_org_member(org_id) AND public.can_write_in_org(org_id));

CREATE POLICY "Org clients can view settings" ON settings
  FOR SELECT USING (public.is_org_member(org_id));

CREATE POLICY "Solo users can manage their own settings" ON settings
  FOR ALL USING (public.is_solo_user() AND public.is_row_owner(user_id) AND org_id IS NULL);

-- =====================================================
-- 8. RLS POLICIES: PROFILES (solo user support)
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Org members can view profiles in their org" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can delete any profile" ON profiles;

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

CREATE POLICY "Solo users can view own profile" ON profiles
  FOR SELECT USING (public.is_solo_user() AND public.is_row_owner(user_id) AND org_id IS NULL);

CREATE POLICY "Solo users can manage own profile" ON profiles
  FOR ALL USING (public.is_solo_user() AND public.is_row_owner(user_id) AND org_id IS NULL);
