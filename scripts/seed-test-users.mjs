import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://weitlewvoufvgfpkryvg.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaXRsZXd2b3VmdmdmcGtyeXZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI5MjA5MywiZXhwIjoyMDk5ODY4MDkzfQ.2ojZEJfO4kgvhxvhNS5RBT_FVE1VRYdGA4bhwYbknFU'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const users = [
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
    role_description: 'Solo User — no organization, personal expense tracking only',
  },
]

async function seed() {
  console.log('🌱 Seeding test users...\n')

  for (const u of users) {
    // Check if user exists
    const { data: existing } = await supabase.auth.admin.listUsers()
    const found = existing?.users?.find(e => e.email === u.email)

    if (found) {
      console.log(`  ⏭  ${u.email} — already exists (id: ${found.id})`)
      continue
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    })

    if (error) {
      console.error(`  ❌ ${u.email} — ${error.message}`)
    } else {
      console.log(`  ✅ ${u.email} — created (id: ${data.user.id})`)
    }
  }

  // Fetch all users for org setup
  const { data: allUsers } = await supabase.auth.admin.listUsers()
  const getUser = (email) => allUsers?.users?.find(u => u.email === email)

  const adminUser = getUser('admin@ledgerly.app')
  const orgAdminUser = getUser('orgadmin@ledgerly.app')
  const managerUser = getUser('manager@ledgerly.app')
  const clientUser = getUser('client@ledgerly.app')
  const soloUser = getUser('solo@ledgerly.app')

  // Create super admin profile
  if (adminUser) {
    const { error } = await supabase.from('profiles').upsert({
      user_id: adminUser.id,
      display_name: adminUser.user_metadata?.full_name || 'Sarah Mitchell',
      org_id: null,
    }, { onConflict: 'user_id' })
    console.log(`  ${error ? '❌' : '✅'} Super admin profile ${error ? error.message : 'created'}`)
  }

  // Create org: Carter Enterprises
  console.log('\n🏢 Creating organization: Carter Enterprises...')
  const { data: orgData, error: orgError } = await supabase.rpc('create_org_for_user', {
    p_org_name: 'Carter Enterprises',
    p_org_slug: 'carter-enterprises',
    p_user_id: orgAdminUser?.id,
    p_plan_slug: 'free',
  })

  if (orgError) {
    console.error(`  ❌ Org creation: ${orgError.message}`)
  } else {
    console.log(`  ✅ Organization created (id: ${orgData})`)
  }

  // Get the org_id
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'carter-enterprises')
    .single()

  const orgId = org?.id

  if (orgId && orgAdminUser) {
    // Add manager to org
    if (managerUser) {
      const { error } = await supabase.from('org_members').upsert({
        org_id: orgId,
        user_id: managerUser.id,
        role: 'manager',
      }, { onConflict: 'org_id,user_id' })
      console.log(`  ${error ? '❌' : '✅'} Manager (Emily) added to org ${error?.message || ''}`)

      // Create profile for manager
      await supabase.from('profiles').upsert({
        user_id: managerUser.id,
        display_name: 'Emily Chen',
        org_id: orgId,
      }, { onConflict: 'user_id' })
    }

    // Add client to org
    if (clientUser) {
      const { error } = await supabase.from('org_members').upsert({
        org_id: orgId,
        user_id: clientUser.id,
        role: 'client',
      }, { onConflict: 'org_id,user_id' })
      console.log(`  ${error ? '❌' : '✅'} Client (David) added to org ${error?.message || ''}`)

      // Create profile for client
      await supabase.from('profiles').upsert({
        user_id: clientUser.id,
        display_name: 'David Park',
        org_id: orgId,
      }, { onConflict: 'user_id' })
    }

    // Create categories for the org
    const categories = [
      { name: 'Office Supplies', icon: 'briefcase', color: '#818cf8', org_id: orgId, user_id: orgAdminUser?.id },
      { name: 'Travel', icon: 'plane', color: '#34d399', org_id: orgId, user_id: orgAdminUser?.id },
      { name: 'Meals & Entertainment', icon: 'utensils', color: '#f59e0b', org_id: orgId, user_id: orgAdminUser?.id },
      { name: 'Software & Subscriptions', icon: 'monitor', color: '#ec4899', org_id: orgId, user_id: orgAdminUser?.id },
      { name: 'Marketing', icon: 'megaphone', color: '#06b6d4', org_id: orgId, user_id: orgAdminUser?.id },
    ]

    const { error: catError } = await supabase.from('categories').insert(categories)
    console.log(`  ${catError ? '❌' : '✅'} Categories created ${catError?.message || `(count: ${categories.length})`}`)

    // Fetch category IDs
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('org_id', orgId)

    // Create sample expenses
    if (cats && cats.length > 0) {
      const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]))
      const now = new Date()
      const expenses = [
        { amount_cents: 4500, currency: 'USD', category_id: catMap['Office Supplies'], date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(), notes: 'Printer paper and toner', org_id: orgId, user_id: orgAdminUser?.id, tax_applicable: true },
        { amount_cents: 12500, currency: 'USD', category_id: catMap['Travel'], date: new Date(now.getFullYear(), now.getMonth(), 8).toISOString(), notes: 'Flight to NYC for QBR', org_id: orgId, user_id: managerUser?.id, tax_applicable: false },
        { amount_cents: 8900, currency: 'USD', category_id: catMap['Meals & Entertainment'], date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(), notes: 'Client dinner at steakhouse', org_id: orgId, user_id: orgAdminUser?.id, tax_applicable: true },
        { amount_cents: 2999, currency: 'USD', category_id: catMap['Software & Subscriptions'], date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), notes: 'Figma team plan', org_id: orgId, user_id: managerUser?.id, tax_applicable: true },
        { amount_cents: 50000, currency: 'USD', category_id: catMap['Marketing'], date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(), notes: 'Google Ads campaign', org_id: orgId, user_id: orgAdminUser?.id, tax_applicable: false },
        { amount_cents: 1200, currency: 'USD', category_id: catMap['Office Supplies'], date: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(), notes: 'Standing desk mat', org_id: orgId, user_id: clientUser?.id, tax_applicable: true },
        { amount_cents: 3500, currency: 'USD', category_id: catMap['Travel'], date: new Date(now.getFullYear(), now.getMonth() - 1, 3).toISOString(), notes: 'Uber rides - November', org_id: orgId, user_id: managerUser?.id, tax_applicable: false },
        { amount_cents: 15900, currency: 'USD', category_id: catMap['Marketing'], date: new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString(), notes: 'Sponsored blog post', org_id: orgId, user_id: orgAdminUser?.id, tax_applicable: true },
        { amount_cents: 7500, currency: 'USD', category_id: catMap['Meals & Entertainment'], date: new Date(now.getFullYear(), now.getMonth() - 1, 18).toISOString(), notes: 'Team lunch', org_id: orgId, user_id: clientUser?.id, tax_applicable: true },
        { amount_cents: 1999, currency: 'USD', category_id: catMap['Software & Subscriptions'], date: new Date(now.getFullYear(), now.getMonth() - 1, 20).toISOString(), notes: 'Notion annual plan', org_id: orgId, user_id: orgAdminUser?.id, tax_applicable: true },
      ]

      const { error: expError } = await supabase.from('expenses').insert(expenses)
      console.log(`  ${expError ? '❌' : '✅'} Expenses created ${expError?.message || `(count: ${expenses.length})`}`)
    }
  }

  // Solo user — profile only, no org
  if (soloUser) {
    await supabase.from('profiles').upsert({
      user_id: soloUser.id,
      display_name: 'Alex Rivera',
      org_id: null,
    }, { onConflict: 'user_id' })

    // Create a solo category + expenses
    const { data: soloCat } = await supabase.from('categories').insert({
      name: 'Personal',
      icon: 'user',
      color: '#a78bfa',
      org_id: null,
      user_id: soloUser.id,
    }).select('id').single()

    if (soloCat) {
      const now = new Date()
      await supabase.from('expenses').insert([
        { amount_cents: 5499, currency: 'USD', category_id: soloCat.id, date: new Date(now.getFullYear(), now.getMonth(), 3).toISOString(), notes: 'Groceries', org_id: null, user_id: soloUser.id, tax_applicable: false },
        { amount_cents: 1500, currency: 'USD', category_id: soloCat.id, date: new Date(now.getFullYear(), now.getMonth(), 7).toISOString(), notes: 'Gym membership', org_id: null, user_id: soloUser.id, tax_applicable: true },
        { amount_cents: 999, currency: 'USD', category_id: soloCat.id, date: new Date(now.getFullYear(), now.getMonth(), 14).toISOString(), notes: 'Netflix', org_id: null, user_id: soloUser.id, tax_applicable: true },
      ])
    }
    console.log(`  ✅ Solo user (Alex) profile + personal expenses created`)
  }

  // Settings for all users
  const allUserIds = [adminUser, orgAdminUser, managerUser, clientUser, soloUser]
    .filter(Boolean)
    .map(u => u.id)

  for (const uid of allUserIds) {
    await supabase.from('settings').upsert({
      user_id: uid,
      org_id: null,
      theme: 'dark',
      base_currency: 'USD',
      vat_rate: 16,
    }, { onConflict: 'user_id,org_id' })
  }
  console.log(`  ✅ Settings created for all users`)

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
  console.log('    Access:   Org dashboard, manage members, full expenses')
  console.log('')
  console.log('  MANAGER (Carter Enterprises)')
  console.log('    Email:    manager@ledgerly.app')
  console.log('    Password: Manager@123!')
  console.log('    Access:   View/manage expenses in org')
  console.log('')
  console.log('  CLIENT (Carter Enterprises)')
  console.log('    Email:    client@ledgerly.app')
  console.log('    Password: Client@123!')
  console.log('    Access:   View-only in org')
  console.log('')
  console.log('  SOLO USER (No Org)')
  console.log('    Email:    solo@ledgerly.app')
  console.log('    Password: Solo@123!')
  console.log('    Access:   Personal expenses only, no org sidebar')
  console.log('')
  console.log('─'.repeat(60))
}

seed().catch(console.error)
