-- Messages table: user-to-admin support tickets + admin-to-user announcements
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('support', 'announcement')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'replied', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_reply TEXT,
  replied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_messages_org_id ON messages(org_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can do everything with messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Org members can view messages for their org
CREATE POLICY "Org members can view messages for their org" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE user_id = auth.uid() AND org_id = messages.org_id
    )
  );

-- Org members can create messages for their org
CREATE POLICY "Org members can create messages for their org" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE user_id = auth.uid() AND org_id = messages.org_id
    )
  );
