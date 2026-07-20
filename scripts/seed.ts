import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : createClient(supabaseUrl, supabaseKey)

const DEMO_EMAIL = 'admin@ledgerly.app'
const DEMO_PASSWORD = '123456'
const DEMO_DISPLAY_NAME = 'Admin'

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

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
const CURRENCY_WEIGHTS = [60, 15, 8, 5, 5, 4, 3]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function weightedRandom(items: string[], weights: number[]): string {
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) return items[i]
  }

  return items[items.length - 1]
}

function randomDate(daysBack: number): string {
  const now = new Date()
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime())
  return new Date(randomTime).toISOString()
}

async function ensureDemoUser(): Promise<string> {
  console.log('Ensuring demo user exists...')

  if (serviceRoleKey) {
    console.log('Using service role key for admin user creation...')

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: list } = await admin.auth.admin.listUsers()
    const existing = list?.users?.find((u) => u.email === DEMO_EMAIL)

    if (existing) {
      console.log(`Demo user already exists: ${DEMO_EMAIL} (id: ${existing.id})`)
      return existing.id
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: DEMO_DISPLAY_NAME,
      },
    })

    if (error) {
      console.error('Error creating demo user:', error.message)
      process.exit(1)
    }

    console.log(`Created demo user: ${DEMO_EMAIL} (id: ${data.user.id})`)
    return data.user.id
  }

  console.log('\nNo SUPABASE_SERVICE_ROLE_KEY found. Trying sign-in...')
  console.log('Attempting to sign in with existing demo credentials...\n')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  })

  if (error) {
    console.error('Could not sign in as demo user:', error.message)
    console.log('\n╔══════════════════════════════════════════════════════════════╗')
    console.log('║  MANUAL STEP REQUIRED                                       ║')
    console.log('║                                                             ║')
    console.log('║  1. Go to Supabase Dashboard > Authentication > Users       ║')
    console.log('║  2. Click "Add user"                                        ║')
    console.log('║  3. Email: admin@ledgerly.app                               ║')
    console.log('║  4. Password: 123456                                        ║')
    console.log('║  5. Check "Auto Confirm User"                               ║')
    console.log('║  6. Click "Create User"                                     ║')
    console.log('║  7. Run this script again                                   ║')
    console.log('║                                                             ║')
    console.log('║  Also: Disable email confirmation in your Supabase project  ║')
    console.log('║  Go to: Authentication > Providers > Email > toggle OFF     ║')
    console.log('║  "Confirm email"                                            ║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    process.exit(1)
  }

  console.log(`Signed in as: ${DEMO_EMAIL} (id: ${data.user.id})`)
  return data.user.id
}

async function seedCategories(userId: string) {
  console.log('\nSeeding categories...')

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)

  if (existing && existing.length > 0) {
    console.log('Categories already exist, skipping...')
    return
  }

  const categories = CATEGORIES.map((cat) => ({
    user_id: userId,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
  }))

  const { error } = await supabase.from('categories').insert(categories)

  if (error) {
    console.error('Error seeding categories:', error)
    throw error
  }

  console.log(`Created ${categories.length} categories`)
}

async function getCategories(userId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}

async function seedExpenses(userId: string) {
  console.log('Seeding expenses...')

  const { data: existing } = await supabase
    .from('expenses')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log('Expenses already exist, skipping...')
    return
  }

  const categories = await getCategories(userId)
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]))

  const expenses = []

  for (let i = 0; i < 100; i++) {
    const template = EXPENSE_TEMPLATES[randomInt(0, EXPENSE_TEMPLATES.length - 1)]
    const amount = randomInt(template.min, template.max)
    const currency = weightedRandom(CURRENCIES, CURRENCY_WEIGHTS)
    const categoryId = categoryMap.get(template.category) || null
    const isTaxable = Math.random() > 0.7

    expenses.push({
      user_id: userId,
      title: template.title,
      amount_cents: amount,
      currency,
      category_id: categoryId,
      date: randomDate(90),
      notes: Math.random() > 0.5 ? `Sample expense #${i + 1}` : null,
      tax_applicable: isTaxable,
      is_taxable: isTaxable,
      tax_rate_used: isTaxable ? 16 : null,
      tax_amount_cents: isTaxable ? Math.round(amount * 0.16) : null,
      is_deleted: false,
    })
  }

  for (let i = 0; i < expenses.length; i += 20) {
    const batch = expenses.slice(i, i + 20)
    const { error } = await supabase.from('expenses').insert(batch)

    if (error) {
      console.error('Error seeding expenses batch:', error)
      throw error
    }
  }

  console.log(`Created ${expenses.length} expenses`)
}

async function seedProfile(userId: string) {
  console.log('Seeding profile...')

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    console.log('Profile already exists, skipping...')
    return
  }

  const { error } = await supabase.from('profiles').insert({
    user_id: userId,
    display_name: DEMO_DISPLAY_NAME,
    avatar_url: null,
  })

  if (error) {
    console.error('Error seeding profile:', error)
    throw error
  }

  console.log('Created user profile')
}

async function seedSettings(userId: string) {
  console.log('Seeding settings...')

  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    console.log('Settings already exist, skipping...')
    return
  }

  const { error } = await supabase.from('settings').insert({
    user_id: userId,
    theme: 'dark',
    base_currency: 'KES',
    vat_rate: 16,
  })

  if (error) {
    console.error('Error seeding settings:', error)
    throw error
  }

  console.log('Created user settings')
}

async function main() {
  console.log('=== Ledgerly Demo Seeder ===\n')

  const userId = await ensureDemoUser()

  await seedProfile(userId)
  await seedCategories(userId)
  await seedExpenses(userId)
  await seedSettings(userId)

  console.log('\n=== Seeding complete! ===')
  console.log(`\nDemo credentials:`)
  console.log(`  Email:    ${DEMO_EMAIL}`)
  console.log(`  Password: ${DEMO_PASSWORD}`)
  console.log(`  Name:     ${DEMO_DISPLAY_NAME}`)
}

main().catch(console.error)
