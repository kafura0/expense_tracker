-- 014_query_performance.sql
-- Org-wide expense queries (dashboard widgets, expenses list, reports) always
-- filter `org_id` + `is_deleted = false` and typically order by `date DESC`.
-- The only org index on expenses today is the single-column `idx_expenses_org_id`,
-- which forces heap/bitmap scans plus a sort for every org query. Add a partial
-- composite covering the most common shape so the planner can scan + return in
-- order without a sort.

CREATE INDEX IF NOT EXISTS idx_expenses_org_date_active
  ON public.expenses (org_id, date DESC)
  WHERE is_deleted = false;
