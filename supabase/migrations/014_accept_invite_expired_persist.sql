-- ---------------------------------------------------------------------------
-- 014: accept_invite — persist the 'expired' status flip
--
-- Bug found in live smoke test (C10): when accept_invite detected an expired
-- invite it ran `UPDATE invites SET status='expired'` and then
-- `RAISE EXCEPTION 'Invite has expired'`. Raising aborts the surrounding
-- transaction, rolling the UPDATE back — so the row stayed 'pending' with a
-- stale expires_at forever.
--
-- Fix: persist the status flip and return NULL (no exception). Callers that
-- need the distinct message already pre-check expiry (see
-- src/app/(auth)/invite/actions.ts), so no app code depends on the raised
-- error text from the RPC itself.
-- ---------------------------------------------------------------------------

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
    -- Persist the flip, then return NULL. Raising here would abort the
    -- transaction and roll back the UPDATE above (see migration header).
    UPDATE public.invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN NULL;
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
