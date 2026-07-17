import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

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
const CURRENCY_WEIGHTS = [60, 15, 8, 5, 5, 4, 3] // KES most common

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

async function seedCategories(userId: string) {
  console.log('Seeding categories...')
  
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
  
  if (existing && existing.length > 0) {
    console.log('Categories already exist, skipping...')
    return
  }
  
  const categories = CATEGORIES.map(cat => ({
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
  const categoryMap = new Map(categories.map(c => [c.name, c.id]))
  
  const expenses = []
  
  // Generate 100 expenses over the last 90 days
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
  
  // Insert in batches of 20
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
  console.log('=== Ledgerly Database Seeder ===\n')
  
  // Sign in with test credentials
  const email = process.env.SEED_EMAIL || 'test@ledgerly.app'
  const password = process.env.SEED_PASSWORD || 'TestPassword123!'
  
  console.log(`Signing in as ${email}...`)
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (authError) {
    console.error('Auth error:', authError.message)
    console.log('\nPlease create a test user first:')
    console.log(`1. Go to your Supabase dashboard`)
    console.log(`2. Create user: ${email} with password: ${password}`)
    console.log(`3. Run this script again`)
    process.exit(1)
  }
  
  const userId = authData.user.id
  console.log(`Signed in as user: ${userId}\n`)
  
  await seedCategories(userId)
  await seedExpenses(userId)
  await seedSettings(userId)
  
  console.log('\n=== Seeding complete! ===')
  console.log('\nYou can now:')
  console.log('1. Sign in to the app')
  console.log('2. View the dashboard with sample data')
  console.log('3. Add, edit, and delete expenses')
}

main().catch(console.error)