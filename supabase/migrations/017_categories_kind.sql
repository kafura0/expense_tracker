-- =====================================================
-- Migration 017: categories.kind (income/expense)
-- Watch item: categories previously had no way to
-- distinguish income categories from expense categories.
-- =====================================================

ALTER TABLE categories
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'expense'
  CHECK (kind IN ('expense', 'income'));

COMMENT ON COLUMN categories.kind IS
  'Category type: ''expense'' (spending) or ''income'' (earnings). Defaults to expense for all existing rows.';

-- Re-seed the default categories with an explicit kind so new signups
-- inherit the column (existing rows keep the 'expense' default).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile (org_id set later when super admin assigns)
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  -- Create default settings (org_id set later)
  INSERT INTO public.settings (user_id)
  VALUES (NEW.id);

  -- Create default categories (org_id set later), all expense-type
  INSERT INTO public.categories (user_id, name, icon, color, kind) VALUES
    (NEW.id, 'Meals & Entertainment', 'utensils', '#FF6B6B', 'expense'),
    (NEW.id, 'Transport', 'car', '#4ECDC4', 'expense'),
    (NEW.id, 'Housing', 'home', '#45B7D1', 'expense'),
    (NEW.id, 'Utilities', 'zap', '#96CEB4', 'expense'),
    (NEW.id, 'Shopping', 'shopping-bag', '#FFEAA7', 'expense'),
    (NEW.id, 'Health', 'heart', '#DDA0DD', 'expense'),
    (NEW.id, 'Education', 'book', '#98D8C8', 'expense'),
    (NEW.id, 'Other', 'more-horizontal', '#C9C9C9', 'expense');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
