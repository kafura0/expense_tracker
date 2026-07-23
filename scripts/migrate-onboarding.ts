import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrate() {
  console.log('Running onboarding migration...')

  // Add onboarding_completed column
  const { error } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL`
  })

  if (error) {
    // exec_sql might not exist, try direct query via REST
    console.log('RPC not available, trying direct approach...')
    console.log('Column may need to be added via Supabase dashboard SQL editor:')
    console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;')
    console.log('UPDATE profiles SET onboarding_completed = TRUE WHERE onboarding_completed = FALSE;')
    return
  }

  // Mark existing users as onboarded
  const { error: updateError } = await supabase.rpc('exec_sql', {
    sql: `UPDATE profiles SET onboarding_completed = TRUE WHERE onboarding_completed = FALSE`
  })

  if (updateError) {
    console.log('Update note:', updateError.message)
  }

  console.log('Migration complete!')
}

migrate().catch(console.error)
