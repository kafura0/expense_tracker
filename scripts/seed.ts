/**
 * @fileoverview Demo data seeder for the Ledgerly multi-tenant platform.
 *
 * This script creates the initial data needed to demonstrate and test the
 * multi-tenant architecture. It uses the Supabase **service role key** (not
 * the anon key) to bypass RLS policies, because the seed script operates
 * outside of any user session and needs to create data across multiple orgs.
 *
 * ## What it creates:
 *
 * 1. **Super Admin user** (`admin@ledgerly.app`) — a platform-level administrator
 *    with `super_admin` role. This user can access `/admin` routes and manage
 *    all organizations.
 *
 * 2. **Super Admin org** (`ledgerly-platform`) — the platform's own organization,
 *    used for internal/admin operations.
 *
 * 3. **Demo Client user** (`client@demo.com`) — a regular user who belongs to
 *    a demo organization. Used to demonstrate the client-facing expense tracking
 *    features.
 *
 * 4. **Demo Client org** (`demo-client-business`) — a sample organization with:
 *    - A Pro subscription (active, 30-day period)
 *    - User profile and settings (dark theme, KES base currency, 16% VAT)
 *    - 10 expense categories with icons and colors
 *    - 100 randomly generated expenses spanning the last 90 days
 *    - Multi-currency support (weighted toward KES at 60%)
 *
 * ## Multi-tenancy demonstration:
 *
 * The seed data creates TWO separate organizations with different users:
 * - The super admin org demonstrates admin-level access
 * - The demo client org demonstrates normal user access with expense data
 *
 * Both orgs are isolated by RLS policies — the super admin can access both
 * orgs (via super_admin membership), while the demo client can only see
 * their own org's data.
 *
 * ## Security notes:
 *
 * - Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for data creation
 * - The service role key is NEVER exposed to the client (only used here)
 * - The `auth.admin.createUser()` API is used to create users without
 *   requiring email verification (`email_confirm: true`)
 * - Passwords are hardcoded for demo purposes — these credentials are
 *   for local development/testing only
 *
 * @security
 * - This script should NEVER run in production
 * - The service role key must not be committed to version control
 * - Run with: `npx tsx scripts/seed.ts`
 *
 * @see {@link src/shared/lib/supabase/middleware.ts} for how auth works at the middleware layer
 * @see {@link src/entities/expense/repository.ts} for how RLS enforces org isolation
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// The service role key bypasses ALL RLS policies. This is required because
// the seed script operates outside of any user session and needs to create
// data (users, orgs, expenses) across multiple organizations.
// SECURITY: This key must NEVER be used in application code — only in scripts.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required for seeding')
  process.exit(1)
}

// Create a Supabase client with the service role key.
// `autoRefreshToken: false` and `persistSession: false` are set because
// this is a one-shot script — we don't need session management.
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Demo credentials for local development. These are hardcoded intentionally —
// they are for local/testing use only and should never be used in production.
const SUPER_ADMIN_EMAIL = 'admin@ledgerly.app'
const SUPER_ADMIN_PASSWORD = 'Admin@123456789!'

/** Pre-defined expense categories with icons and colors for the demo org.
 *  Each category has a unique color for the chart visualizations. */
const CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#4edea3' },
  { name: 'Transportation', icon: '🚗', color: '#c0c1ff' },
  { name: 'Shopping', icon: '🛒', color: '#ffb3af' },
  { name: 'Entertainment', icon: '🎬', color: '#ffd5a0' },
  { name: 'Bills & Utilities', icon: '💡', color: '#ba68c8' },
  { name: 'Health', icon: '🏥', color: '#4fc3f7' },
  { name: 'Education', icon: '📚', color: '#81c784' },
  { name: 'Travel', icon: '✈️', color: '#ff8a65' },
  { name: 'Groceries', icon: '🥬', color: '#aed581' },
  { name: 'Personal Care', icon: '💇', color: '#f06292' },
]

/**
 * Expense templates for generating realistic demo data.
 * Each template has a title, amount range (in cents), and category.
 * Amounts are in cents to avoid floating-point precision issues with currency.
 * The seed script randomly selects from these templates to generate 100 expenses.
 */
const EXPENSE_TEMPLATES = [
  { title: 'Lunch at cafe', min: 500, max: 2000, category: 'Food & Dining' },
  { title: 'Uber to office', min: 300, max: 1500, category: 'Transportation' },
  { title: 'Netflix subscription', min: 1500, max: 1500, category: 'Entertainment' },
  { title: 'Electricity bill', min: 2000, max: 8000, category: 'Bills & Utilities' },
  { title: 'Grocery shopping', min: 2000, max: 10000, category: 'Groceries' },
  { title: 'Gym membership', min: 3000, max: 5000, category: 'Health' },
  { title: 'Online course', min: 5000, max: 20000, category: 'Education' },
  { title: 'Coffee with friends', min: 200, max: 800, category: 'Food & Dining' },
  { title: 'Petrol fill-up', min: 3000, max: 6000, category: 'Transportation' },
  { title: 'New shoes', min: 3000, max: 15000, category: 'Shopping' },
  { title: 'Movie tickets', min: 500, max: 2000, category: 'Entertainment' },
  { title: 'Water bill', min: 500, max: 2000, category: 'Bills & Utilities' },
  { title: 'Doctor visit', min: 1000, max: 5000, category: 'Health' },
  { title: 'Flight to Nairobi', min: 15000, max: 45000, category: 'Travel' },
  { title: 'Haircut', min: 500, max: 2000, category: 'Personal Care' },
  { title: 'Restaurant dinner', min: 2000, max: 8000, category: 'Food & Dining' },
  { title: 'Bus fare', min: 100, max: 500, category: 'Transportation' },
  { title: 'Internet bill', min: 2000, max: 5000, category: 'Bills & Utilities' },
  { title: 'Books', min: 500, max: 3000, category: 'Education' },
  { title: 'Snacks', min: 100, max: 500, category: 'Groceries' },
]

/**
 * Supported currencies with weighted distribution.
 * KES is dominant (60%) to simulate a Kenya-based primary use case,
 * with other major currencies mixed in for multi-currency demo purposes.
 */
const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
/** Weights must sum to 100 for clarity. KES gets 60% probability. */
const CURRENCY_WEIGHTS = [60, 15, 8, 5, 5, 4, 3]

/**
 * Returns a random integer between min and max (inclusive).
 * Used for generating random expense amounts and selecting templates.
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Selects a random item from an array using weighted probability.
 *
 * Algorithm: generates a random number in [0, totalWeight), then iterates
 * through items subtracting each weight until the cumulative weight exceeds
 * the random value. This gives each item a probability proportional to its weight.
 *
 * @param items - The items to choose from
 * @param weights - The probability weight for each item (must be same length as items)
 * @returns A randomly selected item, weighted by the corresponding weight
 *
 * @example
 * ```ts
 * weightedRandom(['A', 'B', 'C'], [50, 30, 20])
 * // Returns 'A' ~50% of the time, 'B' ~30%, 'C' ~20%
 * ```
 */
function weightedRandom(items: string[], weights: number[]): string {
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let random = Math.random() * totalWeight
  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) return items[i]
  }
  // Fallback to last item (handles floating-point edge case)
  return items[items.length - 1]
}

/**
 * Generates a random ISO date string within the last N days.
 *
 * Used to spread demo expenses across a realistic time range (last 90 days).
 * The date is uniformly distributed across the range — no weighting toward
 * recent dates, which keeps the demo data evenly spread.
 *
 * @param daysBack - How many days back from now to generate dates
 * @returns ISO 8601 date string (e.g., "2026-04-15T14:30:00.000Z")
 */
function randomDate(daysBack: number): string {
  const now = new Date()
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime())
  return new Date(randomTime).toISOString()
}

/**
 * Ensures the super admin user exists in Supabase Auth, creating it if necessary.
 *
 * This function is idempotent — it can be run multiple times without duplicating
 * the user. It checks for an existing user by email before creating a new one.
 *
 * The super admin user:
 * - Has `email_confirm: true` to skip email verification (seed script context)
 * - Has `user_metadata.role = 'super_admin'` for client-side role checks
 * - Is the `created_by` for the platform organization
 *
 * @returns The UUID of the super admin user (existing or newly created)
 * @throws Exits the process if user creation fails (no recovery possible)
 *
 * @security
 * The service role key is used to call `auth.admin.createUser()`, which
 * bypasses the normal signup flow. This is safe because:
 * 1. This is a seed script, not application code
 * 2. The password is hardcoded for demo purposes only
 * 3. The email_confirm flag prevents the user from needing to verify their email
 */
async function ensureSuperAdmin(): Promise<string> {
  console.log('Ensuring super admin exists...')

  // Check if the super admin already exists (idempotent operation)
  const { data: list } = await supabase.auth.admin.listUsers()
  const existing = list?.users?.find((u) => u.email === SUPER_ADMIN_EMAIL)

  if (existing) {
    console.log(`Super admin exists: ${SUPER_ADMIN_EMAIL} (id: ${existing.id})`)
    // Update password to ensure it matches current constant
    await supabase.auth.admin.updateUserById(existing.id, {
      password: SUPER_ADMIN_PASSWORD,
    })
    console.log(`Updated super admin password`)
    return existing.id
  }

  // Create the super admin user via the admin API (bypasses normal signup)
  const { data, error } = await supabase.auth.admin.createUser({
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD,
    email_confirm: true, // Skip email verification — this is a seed script
    user_metadata: { full_name: 'Super Admin', role: 'super_admin' },
  })

  if (error) {
    console.error('Error creating super admin:', error.message)
    process.exit(1)
  }

  console.log(`Created super admin: ${SUPER_ADMIN_EMAIL} (id: ${data.user.id})`)
  return data.user.id
}

/**
 * Creates the platform organization for the super admin, or returns its ID if it exists.
 *
 * This org (`ledgerly-platform`) is the internal/platform-level organization.
 * The super admin is a member of this org with the `super_admin` role, which
 * grants access to admin routes and cross-org management capabilities.
 *
 * @param userId - The UUID of the super admin user (from ensureSuperAdmin)
 * @returns The UUID of the platform organization
 * @throws Exits the process if org creation fails
 *
 * @security
 * The `slug` is used as a unique identifier — checking for existing orgs by slug
 * ensures idempotency. The `created_by` field links the org to the admin user
 * for audit trail purposes. The `org_members` insert creates the role assignment
 * that enables admin route access in the middleware.
 */
async function createSuperAdminOrg(userId: string): Promise<string> {
  console.log('Creating super admin organization...')

  // Check if the platform org already exists (idempotent operation)
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'ledgerly-platform')
    .single()

  if (existing) {
    console.log('Super admin org already exists')
    return existing.id
  }

  // Create the platform organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Ledgerly Platform',
      slug: 'ledgerly-platform',
      created_by: userId,
      status: 'active',
    })
    .select()
    .single()

  if (orgError) {
    console.error('Error creating org:', orgError.message)
    process.exit(1)
  }

  // Create the org membership with super_admin role.
  // This membership is what the middleware checks when validating admin route access.
  await supabase.from('org_members').insert({
    org_id: org.id,
    user_id: userId,
    role: 'super_admin',
  })

  console.log(`Created super admin org: ${org.id}`)
  return org.id
}

async function seedDemoClientAndOrg(managerId: string) {
  console.log('\nSeeding demo client organization...')

  // Check if demo client org exists
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'demo-client-business')
    .single()

  if (existing) {
    console.log('Demo client org already exists, checking client user...')
    // Ensure client user password is current
    const { data: list } = await supabase.auth.admin.listUsers()
    const clientUser = list?.users?.find((u) => u.email === 'client@demo.com')
    if (clientUser) {
      await supabase.auth.admin.updateUserById(clientUser.id, {
        password: 'Client@123456789!',
      })
      console.log('Updated demo client password')
    }
    return
  }

  // Create demo client user
  const { data: clientUser, error: clientError } = await supabase.auth.admin.createUser({
    email: 'client@demo.com',
    password: 'Client@123456789!',
    email_confirm: true,
    user_metadata: { full_name: 'Demo Client' },
  })

  if (clientError) {
    console.error('Error creating demo client:', clientError.message)
    return
  }

  // Create org for client
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Demo Client Business',
      slug: 'demo-client-business',
      created_by: managerId,
      status: 'active',
    })
    .select()
    .single()

  if (orgError) {
    console.error('Error creating client org:', orgError.message)
    return
  }

  // Assign client as member
  await supabase.from('org_members').insert({
    org_id: org.id,
    user_id: clientUser.user.id,
    role: 'client',
  })

  // Assign manager
  await supabase.from('org_members').insert({
    org_id: org.id,
    user_id: managerId,
    role: 'manager',
  })

  // Create subscription
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('slug', 'pro')
    .single()

  if (plan) {
    await supabase.from('subscriptions').insert({
      org_id: org.id,
      plan_id: plan.id,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  // Seed categories, profile, settings, expenses for client
  await supabase.from('profiles').insert({
    user_id: clientUser.user.id,
    display_name: 'Demo Client',
    org_id: org.id,
  })

  await supabase.from('settings').insert({
    user_id: clientUser.user.id,
    theme: 'dark',
    base_currency: 'KES',
    vat_rate: 16,
    org_id: org.id,
  })

  const categories = CATEGORIES.map((cat) => ({
    user_id: clientUser.user.id,
    org_id: org.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
  }))
  await supabase.from('categories').insert(categories)

  // Fetch categories for expense seeding
  const { data: cats } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', clientUser.user.id)

  const categoryMap = new Map((cats || []).map((c: { name: string; id: string }) => [c.name, c.id]))

  // Seed expenses
  const expenses = []
  for (let i = 0; i < 100; i++) {
    const template = EXPENSE_TEMPLATES[randomInt(0, EXPENSE_TEMPLATES.length - 1)]
    const amount = randomInt(template.min, template.max)
    const currency = weightedRandom(CURRENCIES, CURRENCY_WEIGHTS)
    const categoryId = categoryMap.get(template.category) || null
    const isTaxable = Math.random() > 0.7

    expenses.push({
      user_id: clientUser.user.id,
      org_id: org.id,
      title: template.title,
      amount_cents: amount,
      currency,
      category_id: categoryId,
      date: randomDate(90),
      notes: Math.random() > 0.5 ? `Demo expense #${i + 1}` : null,
      tax_applicable: isTaxable,
      is_taxable: isTaxable,
      tax_rate_used: isTaxable ? 16 : null,
      tax_amount_cents: isTaxable ? Math.round(amount * 0.16) : null,
      is_deleted: false,
    })
  }

  for (let i = 0; i < expenses.length; i += 20) {
    const batch = expenses.slice(i, i + 20)
    await supabase.from('expenses').insert(batch)
  }

  console.log(`Created demo client with ${expenses.length} expenses`)
}

async function main() {
  console.log('=== Ledgerly Multi-Tenant Seeder ===\n')

  const adminId = await ensureSuperAdmin()
  await createSuperAdminOrg(adminId)
  await seedDemoClientAndOrg(adminId)

  console.log('\n=== Seeding complete! ===')
  console.log(`\nSuper Admin credentials:`)
  console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`)
  console.log(`  Password: ${SUPER_ADMIN_PASSWORD}`)
  console.log(`\nDemo Client credentials:`)
  console.log(`  Email:    client@demo.com`)
  console.log(`  Password: Client@123456789!`)
}

main().catch(console.error)
