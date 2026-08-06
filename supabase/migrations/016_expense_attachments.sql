-- =====================================================
-- 016: EXPENSE ATTACHMENTS (receipts) + STORAGE BUCKET
--
-- Receipt uploads: a private `receipts` storage bucket plus
-- a metadata table that links files to expenses and re-uses
-- the expenses RLS audience (org members / solo owners).
--
-- Storage path convention: <user_id>/<expense_id>/<uuid>.<ext>
--   - INSERT/UPDATE/DELETE are gated to the uploader (first
--     path segment == auth.uid()).
--   - SELECT additionally opens the file to any member of the
--     expense's org (join through expense_attachments -> expenses),
--     so an org member can view/re-download a teammate's receipt.
-- =====================================================

-- ------------------------------------------------------------------
-- 1. EXPENSE ATTACHMENTS TABLE
-- ------------------------------------------------------------------
CREATE TABLE public.expense_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
  storage_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expense_attachments_expense ON public.expense_attachments(expense_id);
CREATE INDEX idx_expense_attachments_org ON public.expense_attachments(org_id);

-- Convenience flag on the expense row so the table UI can show a
-- receipt indicator without an extra JOIN per row.
ALTER TABLE public.expenses
  ADD COLUMN has_attachments BOOLEAN NOT NULL DEFAULT false;

-- ------------------------------------------------------------------
-- 2. RLS (mirrors the expenses audience)
-- ------------------------------------------------------------------
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with attachments"
  ON public.expense_attachments
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Org members can manage attachments"
  ON public.expense_attachments
  FOR ALL USING (
    public.is_org_member(org_id)
    AND public.can_write_in_org(org_id)
  );

CREATE POLICY "Solo users can manage own attachments"
  ON public.expense_attachments
  FOR ALL USING (
    public.is_solo_user()
    AND public.is_row_owner(user_id)
    AND org_id IS NULL
  );

-- ------------------------------------------------------------------
-- 3. PRIVATE RECEIPTS BUCKET + STORAGE RLS
-- ------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Receipts readable by owner or expense org" ON storage.objects;
CREATE POLICY "Receipts readable by owner or expense org"
  ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.expense_attachments a
        JOIN public.expenses e ON e.id = a.expense_id
        WHERE a.storage_path = name
          AND (
            (e.org_id IS NOT NULL AND public.is_org_member(e.org_id))
            OR (e.org_id IS NULL AND e.user_id = auth.uid())
          )
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can overwrite own receipts" ON storage.objects;
CREATE POLICY "Authenticated users can overwrite own receipts"
  ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can delete own receipts" ON storage.objects;
CREATE POLICY "Authenticated users can delete own receipts"
  ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.expense_attachments a
        JOIN public.expenses e ON e.id = a.expense_id
        WHERE a.storage_path = name
          AND e.org_id IS NOT NULL
          AND public.is_org_member(e.org_id)
      )
    )
  );
