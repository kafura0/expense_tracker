-- ExpenseOS Initial Schema
-- Creates all tables, indexes, constraints, and RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for profiles
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for categories
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_created_at ON categories(created_at);

-- =====================================================
-- EXPENSES TABLE
-- =====================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  converted_amount_cents INTEGER,
  converted_currency TEXT,
  exchange_rate_used NUMERIC,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  tax_applicable BOOLEAN DEFAULT false,
  is_taxable BOOLEAN DEFAULT false,
  tax_rate_used NUMERIC,
  tax_amount_cents INTEGER,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for expenses
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_is_deleted ON expenses(is_deleted);

-- =====================================================
-- SETTINGS TABLE
-- =====================================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  base_currency TEXT DEFAULT 'USD' NOT NULL,
  vat_rate NUMERIC(5,2) DEFAULT 16.00 NOT NULL,
  theme TEXT DEFAULT 'system' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for settings
CREATE INDEX idx_settings_user_id ON settings(user_id);

-- =====================================================
-- EXCHANGE RATES TABLE
-- =====================================================
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ,
  UNIQUE(base_currency, target_currency)
);

-- Indexes for exchange_rates
CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(base_currency, target_currency);
CREATE INDEX idx_exchange_rates_expires_at ON exchange_rates(expires_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Settings policies
CREATE POLICY "Users can view own settings" ON settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON settings
  FOR DELETE USING (auth.uid() = user_id);

-- Exchange rates policies (public read, authenticated write)
CREATE POLICY "Authenticated users can view exchange rates" ON exchange_rates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert exchange rates" ON exchange_rates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update exchange rates" ON exchange_rates
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete exchange rates" ON exchange_rates
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- SEED DEFAULT CATEGORIES
-- =====================================================
-- Note: This uses a function to seed categories for each new user
-- The function will be called when a user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  -- Create default settings
  INSERT INTO public.settings (user_id)
  VALUES (NEW.id);

  -- Create default categories
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

-- Trigger to handle new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();