-- =====================================================
-- PLATFORM ANNOUNCEMENTS, OFFERS & ACCOUNT SUSPENSION
-- Migration 008
--
-- Adds:
--  1. messages.category        — announcement / offer / maintenance
--  2. messages.audience        — everyone / orgs / solo / org
--  3. messages.target_org_id   — specific org for audience = 'org'
--  4. RLS policy so end users (org members + solo) can read the
--     platform announcements targeted at them (org_id IS NULL).
--  5. profiles.is_suspended    — per-account suspension for the admin panel
-- =====================================================

-- =====================================================
-- 1. MESSAGES: PLATFORM ANNOUNCEMENT BROADCASTS
-- =====================================================

ALTER TABLE messages
  ADD COLUMN category TEXT NOT NULL DEFAULT 'announcement'
    CHECK (category IN ('announcement', 'offer', 'maintenance')),
  ADD COLUMN audience TEXT NOT NULL DEFAULT 'everyone'
    CHECK (audience IN ('everyone', 'orgs', 'solo', 'org')),
  ADD COLUMN target_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_category ON messages(category);
CREATE INDEX IF NOT EXISTS idx_messages_audience ON messages(audience);
CREATE INDEX IF NOT EXISTS idx_messages_target_org_id ON messages(target_org_id);

-- End users (org members + solo) can read platform announcements (org_id NULL)
-- that target them. Legacy org-scoped messages (org_id NOT NULL) remain
-- governed by the existing "Org members can view messages for their org"
-- policy, so a platform broadcast can never leak an org-scoped message.
CREATE POLICY "Users can read platform announcements" ON messages
  FOR SELECT USING (
    type = 'announcement'
    AND org_id IS NULL
    AND (
      audience = 'everyone'
      OR (audience = 'orgs' AND NOT public.is_solo_user())
      OR (audience = 'solo' AND public.is_solo_user())
      OR (audience = 'org' AND target_org_id IS NOT NULL AND public.is_org_member(target_org_id))
    )
  );

-- =====================================================
-- 2. PROFILES: PER-ACCOUNT SUSPENSION
-- =====================================================

ALTER TABLE profiles
  ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT false;
