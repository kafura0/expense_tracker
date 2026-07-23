-- Add onboarding completion tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Mark existing users as onboarded (they're already using the app)
UPDATE profiles SET onboarding_completed = TRUE WHERE onboarding_completed = FALSE;

-- Create index for quick onboarding checks
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(user_id, onboarding_completed);
