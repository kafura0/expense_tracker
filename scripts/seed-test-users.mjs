import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://weitlewvoufvgfpkryvg.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaXRsZXd2b3VmdmdmcGtyeXZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI5MjA5MywiZXhwIjoyMDk5ODY4MDkzfQ.2ojZEJfO4kgvhxvhNS5RBT_FVE1VRYdGA4bhwYbknFU'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const USERS = [
  {
    email: 'admin@ledgerly.app',
    password: 'Admin@123456789!',
    full_name: 'Sarah Mitchell',
    role_description: 'Super Admin — full access to admin dashboard, all orgs, all data',
  },
  {
    email: 'orgadmin@ledgerly.app',
    password: 'OrgAdmin@123!',
    full_name: 'James Carter',
    role_description: 'Organization Admin — manages "Carter Enterprises" org, can invite clients',
  },
  {
    email: 'manager@ledgerly.app',
    password: 'Manager@123!',
    full_name: 'Emily Chen',
    role_description: 'Manager — manages expenses in "Carter Enterprises", can invite clients',
  },
  {
    email: 'client@ledgerly.app',
    password: 'Client@123!',
    full_name: 'David Park',
    role_description: 'Client — views own expenses in "Carter Enterprises"',
  },
  {
    email: 'solo@ledgerly.app',
    password: 'Solo@123!',
    full_name: 'Alex Rivera',
    role_description: 'Solo User — no organization, personal expense tracking in KES',
  },
]

const log = (symbol, msg) => console.log(`  ${symbol} ${msg}`)

async function getOrCreateUser(u) {
  const { data } = await supabase.auth.admin.listUsers()
  const found = data?.users?.find((e) => e.email === u.email)
  if (found) {
    log('⏭', `${u.email} — already exists (id: ${found.id})`)
    return found
  }

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name },
  })

  if (error) {
    log('❌', `${u.email} — ${error.message}`)
    return null
  }
  log('✅', `${u.email} — created (id: ${created.user.id})`)
  return created.user
}

async function ensureProfile(userId, displayName, orgId = null) {
  const { error } = await supabase.from('profiles').upsert(
    { user_id: userId, display_name: displayName, org_id: orgId },
    { onConflict: 'user_id' }
  )
  return error
}

async function ensureOrgCategories(orgId, userId, templates) {
  const { data: existing } = await supabase
    .from('categories')
    .select('id, name')
    .eq('org_id', orgId)

  const existingNames = new Set((existing || []).map((c) => c.name))
  const toInsert = templates
    .filter((t) => !existingNames.has(t.name))
    .map((t) => ({ ...t, org_id: orgId, user_id: userId }))

  if (toInsert.length > 0) {
    const { error } = await supabase.from('categories').insert(toInsert)
    if (error) log('❌', `Categories: ${error.message}`)
  }

  const { data: all } = await supabase
    .from('categories')
    .select('id, name')
    .eq('org_id', orgId)

  return Object.fromEntries((all || []).map((c) => [c.name, c.id]))
}

async function ensureSoloCategories(userId, names) {
  const { data: existing } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .is('org_id', null)

  const byName = new Map((existing || []).map((c) => [c.name, c.id]))
  const missing = names.filter((n) => !byName.has(n))

  const iconBy = {
    'Food & Dining': 'utensils',
    Housing: 'home',
    Shopping: 'shopping-bag',
    Transport: 'car',
    Utilities: 'zap',
    Health: 'heart',
    Subscriptions: 'coffee',
    Internet: 'wifi',
    Education: 'book',
    Travel: 'plane',
    Other: 'misc',
  }
  const colorBy = {
    'Food & Dining': '#f59e0b',
    Housing: '#38bdf8',
    Shopping: '#a78bfa',
    Transport: '#34d399',
    Utilities: '#facc15',
    Health: '#fb7185',
    Subscriptions: '#f472b6',
    Internet: '#2dd4bf',
    Education: '#94a3b8',
    Travel: '#ec4899',
    Other: '#64748b',
  }

  if (missing.length > 0) {
    const { error } = await supabase.from('categories').insert(
      missing.map((name) => ({
        name,
        icon: iconBy[name] || 'misc',
        color: colorBy[name] || '#64748b',
        user_id: userId,
        org_id: null,
      }))
    )
    if (error) log('❌', `Solo categories: ${error.message}`)
  }

  const { data: all } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .is('org_id', null)

  return Object.fromEntries((all || []).map((c) => [c.name, c.id]))
}

function monthOffsetDate(monthsAgo, day) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.min(day, 27))
  d.setHours(10 + (day % 8), 0, 0, 0)
  return d.toISOString()
}

function roundToInt(n) {
  return Math.round(n)
}

async function seed() {
  console.log('🌱 Seeding demo data...\n')

  const users = {}
  for (const u of USERS) users[u.email] = await getOrCreateUser(u)

  const adminUser = users['admin@ledgerly.app']
  const orgAdminUser = users['orgadmin@ledgerly.app']
  const managerUser = users['manager@ledgerly.app']
  const clientUser = users['client@ledgerly.app']
  const soloUser = users['solo@ledgerly.app']

  if (!adminUser || !orgAdminUser || !managerUser || !clientUser || !soloUser) {
    console.error('\n❌ Could not resolve all users. Aborting.')
    return
  }

  // -------------------------------------------------
  // Profiles
  // -------------------------------------------------
  console.log('\n👤 Profiles')
  for (const [email, u] of Object.entries(users)) {
    const name = USERS.find((x) => x.email === email).full_name
    const err = await ensureProfile(u.id, name, null)
    log(err ? '❌' : '✅', `${name} profile ${err?.message || 'ok'}`)
  }

  // -------------------------------------------------
  // Organization
  // -------------------------------------------------
  console.log('\n🏢 Organization: Carter Enterprises')
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'carter-enterprises')
    .maybeSingle()

  let orgId = existingOrg?.id || null

  if (!orgId) {
    const { data: createdOrgId, error: orgError } = await supabase.rpc('create_org_for_user', {
      p_org_name: 'Carter Enterprises',
      p_org_slug: 'carter-enterprises',
      p_user_id: orgAdminUser.id,
      p_plan_slug: 'free',
    })
    if (orgError) {
      log('❌', `Org creation: ${orgError.message}`)
    } else {
      orgId = createdOrgId
      log('✅', `Organization created (id: ${orgId})`)
    }
  } else {
    log('⏭', `Organization already exists (id: ${orgId})`)
  }

  if (!orgId) {
    console.error('\n❌ No org id. Aborting.')
    return
  }

  // Memberships
  const memberships = [
    { user_id: managerUser.id, role: 'manager' },
    { user_id: clientUser.id, role: 'client' },
  ]
  for (const m of memberships) {
    const { error } = await supabase.from('org_members').upsert(
      { org_id: orgId, ...m },
      { onConflict: 'org_id,user_id' }
    )
    log(error ? '❌' : '✅', `Member ${m.role} ${error?.message || 'ok'}`)
  }

  // Refresh subscription so the org health card shows a live billing period
  const { data: plans } = await supabase.from('plans').select('id').eq('slug', 'free').maybeSingle()
  const periodStart = new Date()
  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + 30)
  if (plans) {
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('org_id', orgId)
      .maybeSingle()
    const subPayload = {
      org_id: orgId,
      plan_id: plans.id,
      status: 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
    }
    const subQuery = existingSub
      ? supabase.from('subscriptions').update(subPayload).eq('id', existingSub.id)
      : supabase.from('subscriptions').insert(subPayload)
    const { error: subError } = await subQuery
    log(subError ? '❌' : '✅', `Subscription refreshed ${subError?.message || '(billing period +30d)'}`)
  }

  // -------------------------------------------------
  // Categories
  // -------------------------------------------------
  console.log('\n🏷️  Categories')
  const orgCatTemplates = [
    { name: 'Office Supplies', icon: 'briefcase', color: '#818cf8' },
    { name: 'Travel', icon: 'plane', color: '#34d399' },
    { name: 'Meals & Entertainment', icon: 'utensils', color: '#f59e0b' },
    { name: 'Software & Subscriptions', icon: 'monitor', color: '#ec4899' },
    { name: 'Marketing', icon: 'megaphone', color: '#06b6d4' },
  ]
  const orgCats = await ensureOrgCategories(orgId, orgAdminUser.id, orgCatTemplates)
  log('✅', `Org categories ready (${Object.keys(orgCats).length})`)

  const soloCatNames = [
    'Housing', 'Food & Dining', 'Transport', 'Shopping', 'Utilities', 'Health', 'Subscriptions', 'Internet',
  ]
  const soloCats = await ensureSoloCategories(soloUser.id, soloCatNames)
  log('✅', `Solo categories ready (${Object.keys(soloCats).length})`)

  // -------------------------------------------------
  // Clean previous demo expenses + budgets
  // -------------------------------------------------
  console.log('\n🧹 Cleaning previous demo rows')
  const demoIds = [adminUser.id, orgAdminUser.id, managerUser.id, clientUser.id, soloUser.id]
  const { error: delExp } = await supabase
    .from('expenses')
    .delete()
    .in('user_id', demoIds)
  log(delExp ? '❌' : '✅', `Cleared demo expenses ${delExp?.message || ''}`)
  const { error: delBud } = await supabase
    .from('budgets')
    .delete()
    .in('user_id', demoIds)
  log(delBud ? '❌' : '✅', `Cleared demo budgets ${delBud?.message || ''}`)

  // -------------------------------------------------
  // Org expenses — 6 months, spread across James/Emily/David
  // -------------------------------------------------
  console.log('\n💳 Org expenses (6 months, USD)')
  const monthFactor = [1.15, 0.9, 1.05, 0.95, 1.1, 1.0] // current month first

  const orgExpenseTemplates = [
    { cat: 'Office Supplies', base: 9500, user: orgAdminUser, notes: 'Office supplies restock', tax: true },
    { cat: 'Office Supplies', base: 1800, user: clientUser, notes: 'Desk accessories', tax: true },
    { cat: 'Travel', base: 125000, user: managerUser, notes: 'Business flight', tax: false },
    { cat: 'Travel', base: 3500, user: managerUser, notes: 'Rideshare to client sites', tax: false },
    { cat: 'Meals & Entertainment', base: 8900, user: orgAdminUser, notes: 'Client dinner', tax: true },
    { cat: 'Meals & Entertainment', base: 6500, user: clientUser, notes: 'Team lunch', tax: true },
    { cat: 'Software & Subscriptions', base: 49990, user: managerUser, notes: 'SaaS subscriptions', tax: true },
    { cat: 'Software & Subscriptions', base: 19990, user: orgAdminUser, notes: 'Annual software renewals', tax: true },
    { cat: 'Marketing', base: 500000, user: orgAdminUser, notes: 'Ads campaign', tax: false },
    { cat: 'Marketing', base: 15900, user: managerUser, notes: 'Sponsored content', tax: true },
  ]

  const orgExpenseRows = []
  for (let m = 0; m < 6; m++) {
    const factor = monthFactor[m]
    for (let i = 0; i < orgExpenseTemplates.length; i++) {
      const t = orgExpenseTemplates[i]
      const amount = roundToInt(t.base * factor)
      orgExpenseRows.push({
        amount_cents: amount,
        currency: 'USD',
        category_id: orgCats[t.cat],
        date: monthOffsetDate(m, 3 + ((i * 3) % 24)),
        notes: `${t.notes} — ${new Date().getMonth() - m < 0 ? 'last' : 'this'} month`,
        org_id: orgId,
        user_id: t.user.id,
        tax_applicable: t.tax,
        tax_amount_cents: t.tax ? roundToInt(amount * 0.16) : null,
      })
    }
  }

  const { error: orgExpError } = await supabase.from('expenses').insert(orgExpenseRows)
  log(orgExpError ? '❌' : '✅', `Inserted ${orgExpenseRows.length} org expenses ${orgExpError?.message || ''}`)

  // -------------------------------------------------
  // Solo expenses — 6 months, KES
  // -------------------------------------------------
  console.log('\n🏠 Solo expenses (6 months, KES)')
  const soloExpenseTemplates = [
    { cat: 'Housing', base: 42000, notes: 'Monthly rent' },
    { cat: 'Food & Dining', base: 13500, notes: 'Groceries' },
    { cat: 'Transport', base: 6800, notes: 'Fares and fuel' },
    { cat: 'Shopping', base: 5200, notes: 'Market shopping' },
    { cat: 'Utilities', base: 3800, notes: 'Electricity and water' },
    { cat: 'Health', base: 2000, notes: 'Pharmacy' },
    { cat: 'Subscriptions', base: 1500, notes: 'Streaming + apps' },
    { cat: 'Internet', base: 3000, notes: 'Home internet' },
  ]

  const soloExpenseRows = []
  for (let m = 0; m < 6; m++) {
    const factor = monthFactor[m]
    for (let i = 0; i < soloExpenseTemplates.length; i++) {
      const t = soloExpenseTemplates[i]
      const amount = roundToInt(t.base * factor)
      soloExpenseRows.push({
        amount_cents: amount * 100, // KES amount -> cents
        currency: 'KES',
        category_id: soloCats[t.cat],
        date: monthOffsetDate(m, 2 + ((i * 3) % 25)),
        notes: `${t.notes} — month ${6 - m}`,
        org_id: null,
        user_id: soloUser.id,
        tax_applicable: false,
        tax_amount_cents: null,
      })
    }
  }

  const { error: soloExpError } = await supabase.from('expenses').insert(soloExpenseRows)
  log(soloExpError ? '❌' : '✅', `Inserted ${soloExpenseRows.length} solo expenses ${soloExpError?.message || ''}`)

  // -------------------------------------------------
  // Budgets
  // -------------------------------------------------
  console.log('\n🎯 Budgets')
  const orgBudgets = [
    { cat: 'Office Supplies', amount: 60000 },
    { cat: 'Travel', amount: 200000 },
    { cat: 'Meals & Entertainment', amount: 150000 },
    { cat: 'Software & Subscriptions', amount: 100000 },
    { cat: 'Marketing', amount: 800000 },
  ].map((b) => ({
    scope: 'org',
    org_id: orgId,
    user_id: orgAdminUser.id,
    category_id: orgCats[b.cat],
    amount_cents: b.amount,
  }))

  const soloBudgets = [
    { cat: 'Housing', amount: 4500000 },
    { cat: 'Food & Dining', amount: 1500000 },
    { cat: 'Transport', amount: 800000 },
    { cat: 'Shopping', amount: 700000 },
    { cat: 'Utilities', amount: 450000 },
    { cat: 'Health', amount: 400000 },
    { cat: 'Subscriptions', amount: 200000 },
    { cat: 'Internet', amount: 300000 },
  ].map((b) => ({
    scope: 'user',
    org_id: null,
    user_id: soloUser.id,
    category_id: soloCats[b.cat],
    amount_cents: b.amount,
  }))

  try {
    const { error: budgetError } = await supabase.from('budgets').insert([...orgBudgets, ...soloBudgets])
    log(budgetError ? '❌' : '✅', `Inserted ${orgBudgets.length + soloBudgets.length} budgets ${budgetError?.message || ''}`)
  } catch (e) {
    log('⚠️', `Budgets table unavailable — run migration 006 first (${e.message})`)
  }

  // -------------------------------------------------
  // Settings
  // -------------------------------------------------
  console.log('\n⚙️  Settings')
  const settingsRows = [
    { user_id: adminUser.id, org_id: null, theme: 'dark', base_currency: 'USD', vat_rate: 16 },
    { user_id: orgAdminUser.id, org_id: orgId, theme: 'dark', base_currency: 'USD', vat_rate: 16 },
    { user_id: managerUser.id, org_id: orgId, theme: 'dark', base_currency: 'USD', vat_rate: 16 },
    { user_id: clientUser.id, org_id: orgId, theme: 'dark', base_currency: 'USD', vat_rate: 16 },
    { user_id: soloUser.id, org_id: null, theme: 'dark', base_currency: 'KES', vat_rate: 16 },
  ]
  for (const row of settingsRows) {
    const { error } = await supabase.from('settings').upsert(row, { onConflict: 'user_id,org_id' })
    if (error) log('❌', `Settings ${row.user_id}: ${error.message}`)
  }
  log('✅', `Settings for ${settingsRows.length} rows`)

  // -------------------------------------------------
  // Summary
  // -------------------------------------------------
  console.log('\n🎉 Seeding complete!\n')
  console.log('─'.repeat(60))
  console.log('  TEST CREDENTIALS')
  console.log('─'.repeat(60))
  console.log('')
  console.log('  SUPER ADMIN')
  console.log('    Email:    admin@ledgerly.app')
  console.log('    Password: Admin@123456789!')
  console.log('    Access:   Full admin dashboard, all orgs')
  console.log('')
  console.log('  ORG ADMIN (Carter Enterprises)')
  console.log('    Email:    orgadmin@ledgerly.app')
  console.log('    Password: OrgAdmin@123!')
  console.log('    Access:   Command Center, manage members, org-wide expenses')
  console.log('')
  console.log('  MANAGER (Carter Enterprises)')
  console.log('    Email:    manager@ledgerly.app')
  console.log('    Password: Manager@123!')
  console.log('    Access:   Team Pulse, org-wide expenses + budgets')
  console.log('')
  console.log('  CLIENT (Carter Enterprises)')
  console.log('    Email:    client@ledgerly.app')
  console.log('    Password: Client@123!')
  console.log('    Access:   Own expenses + personal budget within org')
  console.log('')
  console.log('  SOLO USER (No Org)')
  console.log('    Email:    solo@ledgerly.app')
  console.log('    Password: Solo@123!')
  console.log('    Access:   Personal expenses in KES, personal budgets')
  console.log('')
  console.log('─'.repeat(60))
}

seed().catch(console.error)
