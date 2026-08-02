/**
 * @fileoverview Seeds realistic demo data for Carter Enterprises (James Carter).
 *
 * James Carter is the org admin of Carter Enterprises (`orgadmin@ledgerly.app`).
 * The org already has ~70 expenses, but zero income. This script:
 *
 * 1. Ensures the org has the fixed Ledgerly category catalog rows (by name).
 * 2. Seeds realistic income entries (consulting retainers, invoices, project
 *    fees, passive income) spanning roughly the last 8 months.
 * 3. Seeds a small batch of recent, plausible business expenses.
 *
 * Idempotent: income seeding is skipped if income already exists for the org,
 * and categories are created only when missing.
 *
 * Uses the service role key (bypasses RLS) — for demo/test environments only.
 *
 * Run with: `npx tsx scripts/seed-carter.ts`
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required for seeding')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ORGADMIN_EMAIL = 'orgadmin@ledgerly.app'
const ORG_SLUG = 'carter-enterprises'
const USD_TO_KES_FALLBACK = 153.5

const CATALOG = [
  { key: 'earned-income', kind: 'income', name: 'Earned Income', icon: 'briefcase', color: '#34d399' },
  { key: 'side-hustle-income', kind: 'income', name: 'Side Hustle Income', icon: 'monitor', color: '#818cf8' },
  { key: 'passive-income', kind: 'income', name: 'Passive Income', icon: 'home', color: '#38bdf8' },
  { key: 'portfolio-income', kind: 'income', name: 'Portfolio Income', icon: 'trending-up', color: '#f59e0b' },
  { key: 'other-income', kind: 'income', name: 'Other Income', icon: 'misc', color: '#94a3b8' },
  { key: 'fixed-expenses', kind: 'expense', name: 'Fixed Expenses', icon: 'wifi', color: '#a78bfa' },
  { key: 'variable-expenses', kind: 'expense', name: 'Variable Expenses', icon: 'groceries', color: '#34d399' },
  { key: 'healthcare-personal', kind: 'expense', name: 'Healthcare & Personal', icon: 'medical', color: '#f472b6' },
  { key: 'debt-savings', kind: 'expense', name: 'Debt & Savings', icon: 'piggy-bank', color: '#facc15' },
  { key: 'discretionary-wants', kind: 'expense', name: 'Discretionary / Wants', icon: 'music', color: '#fb7185' },
]

/** ISO string for the given year/month/day at a given local hour (UTC). */
function iso(y: number, m: number, d: number, h = 10, min = 0): string {
  return new Date(Date.UTC(y, m - 1, d, h, min)).toISOString()
}

function usd(amount: number) {
  return Math.round(amount * 100)
}

function kes(amount: number) {
  return Math.round(amount * 100)
}

/** Converts a KES cents amount to USD cents using the fallback rate. */
function kesToUsdCents(kesCents: number): number {
  return Math.round(kesCents / USD_TO_KES_FALLBACK)
}

async function main() {
  console.log('=== Carter Enterprises seeder ===\n')

  const { data: list } = await supabase.auth.admin.listUsers()
  const carter = list?.users?.find((u) => u.email === ORGADMIN_EMAIL)
  if (!carter) {
    console.error(`User ${ORGADMIN_EMAIL} not found. Run scripts/seed-test-users.mjs first.`)
    process.exit(1)
  }

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', ORG_SLUG).maybeSingle()
  if (!org) {
    console.error(`Organization ${ORG_SLUG} not found.`)
    process.exit(1)
  }

  const userId = carter.id
  const orgId = org.id
  console.log(`James Carter (${ORGADMIN_EMAIL}) -> Carter Enterprises (${orgId})`)

  // 1. Ensure catalog categories exist for the org.
  const { data: existingCats } = await supabase
    .from('categories')
    .select('id, name, org_id')
    .eq('org_id', orgId)
  const existingNames = new Set((existingCats || []).map((c: { name: string }) => c.name.toLowerCase()))
  const missing = CATALOG.filter((c) => !existingNames.has(c.name.toLowerCase()))
  if (missing.length > 0) {
    const { error } = await supabase.from('categories').insert(
      missing.map((c) => ({
        user_id: userId,
        org_id: orgId,
        name: c.name,
        icon: c.icon,
        color: c.color,
      }))
    )
    if (error) throw new Error(`Category insert failed: ${error.message}`)
    console.log(`Created ${missing.length} catalog categories`)
  } else {
    console.log('All catalog categories already present')
  }

  const { data: cats } = await supabase
    .from('categories')
    .select('id, name')
    .eq('org_id', orgId)
  const categoryMap = new Map(
    (cats || []).map((c: { name: string; id: string }) => [c.name.toLowerCase(), c.id])
  )
  const catId = (name: string) => categoryMap.get(name.toLowerCase()) ?? null

  // 2. Seed income if none exists yet.
  const { count: incomeCount } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('entry_type', 'income')

  if ((incomeCount ?? 0) > 0) {
    console.log(`Income already seeded (${incomeCount} rows). Skipping income.`)
  } else {
    // Retainer/invoice income, ~biweekly cadence across 8 months.
    const retainers = [
      ['Acme Logistics — consulting retainer', 'Earned Income', 1800, 'Jan'],
      ['Savanna Foods — project invoice', 'Earned Income', 4250, 'Jan'],
      ['Mara Hotels — UX workshop', 'Side Hustle Income', 1250, 'Feb'],
      ['Acme Logistics — consulting retainer', 'Earned Income', 1800, 'Feb'],
      ['Tsavo Retail — brand refresh (milestone 1)', 'Earned Income', 3000, 'Mar'],
      ['Acme Logistics — consulting retainer', 'Earned Income', 1800, 'Mar'],
      ['Savanna Foods — monthly support', 'Earned Income', 950, 'Apr'],
      ['Acme Logistics — consulting retainer', 'Earned Income', 1800, 'Apr'],
      ['Tsavo Retail — brand refresh (milestone 2)', 'Earned Income', 4000, 'May'],
      ['Acme Logistics — consulting retainer', 'Earned Income', 1800, 'May'],
      ['Mara Hotels — digital strategy sprint', 'Side Hustle Income', 1600, 'Jun'],
      ['Acme Logistics — consulting retainer', 'Earned Income', 1800, 'Jun'],
      ['Savanna Foods — platform buildout', 'Earned Income', 5200, 'Jul'],
      ['Acme Logistics — consulting retainer', 'Earned Income', 1800, 'Jul'],
      ['Mara Hotels — retainer renewal', 'Side Hustle Income', 1500, 'Aug'],
      ['Acme Logistics — consulting retainer', 'Earned Income', 1800, 'Aug'],
    ]

    const dates = [
      iso(2026, 1, 8), iso(2026, 1, 22), iso(2026, 2, 12), iso(2026, 2, 26),
      iso(2026, 3, 10), iso(2026, 3, 24), iso(2026, 4, 14), iso(2026, 4, 28),
      iso(2026, 5, 12), iso(2026, 5, 27), iso(2026, 6, 9), iso(2026, 6, 23),
      iso(2026, 7, 7), iso(2026, 7, 21), iso(2026, 8, 4), iso(2026, 8, 18),
    ]

    const incomeRows = retainers.map(([title, categoryName, amountUsd], i) => {
      const amountCents = usd(amountUsd as number)
      return {
        user_id: userId,
        org_id: orgId,
        title: title as string,
        amount_cents: amountCents,
        currency: 'USD',
        converted_amount_cents: amountCents,
        converted_currency: 'USD',
        exchange_rate_used: 1,
        category_id: catId(categoryName as string),
        date: dates[i],
        notes: 'Invoice settled via bank transfer',
        tax_applicable: false,
        is_taxable: false,
        entry_type: 'income',
        is_deleted: false,
      }
    })

    // A couple of KES income entries for multi-currency realism.
    incomeRows.push(
      {
        user_id: userId,
        org_id: orgId,
        title: 'Consulting deposit — Kenya client',
        amount_cents: kes(125000),
        currency: 'KES',
        converted_amount_cents: kesToUsdCents(kes(125000)),
        converted_currency: 'USD',
        exchange_rate_used: 1 / USD_TO_KES_FALLBACK,
        category_id: catId('Earned Income'),
        date: iso(2026, 3, 17),
        notes: '50% deposit for advisory engagement',
        tax_applicable: false,
        is_taxable: false,
        entry_type: 'income',
        is_deleted: false,
      },
      {
        user_id: userId,
        org_id: orgId,
        title: 'Dividend payout — index fund',
        amount_cents: usd(212),
        currency: 'USD',
        converted_amount_cents: usd(212),
        converted_currency: 'USD',
        exchange_rate_used: 1,
        category_id: catId('Portfolio Income'),
        date: iso(2026, 5, 30),
        notes: 'Quarterly distribution',
        tax_applicable: false,
        is_taxable: false,
        entry_type: 'income',
        is_deleted: false,
      },
      {
        user_id: userId,
        org_id: orgId,
        title: 'Freelance code audit',
        amount_cents: usd(640),
        currency: 'USD',
        converted_amount_cents: usd(640),
        converted_currency: 'USD',
        exchange_rate_used: 1,
        category_id: catId('Side Hustle Income'),
        date: iso(2026, 7, 12),
        notes: 'One-off engagement',
        tax_applicable: false,
        is_taxable: false,
        entry_type: 'income',
        is_deleted: false,
      }
    )

    const { error: incomeError } = await supabase.from('expenses').insert(incomeRows)
    if (incomeError) throw new Error(`Income insert failed: ${incomeError.message}`)
    console.log(`Inserted ${incomeRows.length} income entries`)
  }

  // 3. Small batch of recent realistic expenses (only if the org has no expenses in Aug 2026).
  const { count: recentCount } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('date', '2026-07-01T00:00:00.000Z')

  if ((recentCount ?? 0) > 10) {
    console.log(`Recent expenses already present (${recentCount}). Skipping expense batch.`)
  } else {
    const recentExpenses = [
      { title: 'Office rent — July', amount: 1450, currency: 'USD', category: 'Fixed Expenses', date: iso(2026, 7, 3), taxable: false },
      { title: 'Figma + Notion subscriptions', amount: 98, currency: 'USD', category: 'Fixed Expenses', date: iso(2026, 7, 5), taxable: false },
      { title: 'Team lunch — project kickoff', amount: 86, currency: 'USD', category: 'Variable Expenses', date: iso(2026, 7, 8), taxable: true },
      { title: 'Fuel — client site visit', amount: kes(4200), currency: 'KES', category: 'Variable Expenses', date: iso(2026, 7, 11), taxable: false },
      { title: 'Fiber internet (business line)', amount: 120, currency: 'USD', category: 'Fixed Expenses', date: iso(2026, 7, 12), taxable: false },
      { title: 'Adobe Creative Cloud — annual', amount: 599, currency: 'USD', category: 'Fixed Expenses', date: iso(2026, 7, 14), taxable: false },
      { title: 'Flight — Nairobi client meeting', amount: 340, currency: 'USD', category: 'Variable Expenses', date: iso(2026, 7, 18), taxable: false },
      { title: 'Dinner with Acme stakeholders', amount: 132, currency: 'USD', category: 'Variable Expenses', date: iso(2026, 7, 19), taxable: true },
      { title: 'Office supplies — print run', amount: 64, currency: 'USD', category: 'Variable Expenses', date: iso(2026, 7, 23), taxable: true },
      { title: 'Gym membership (team wellness)', amount: 45, currency: 'USD', category: 'Healthcare & Personal', date: iso(2026, 7, 25), taxable: false },
      { title: 'Office rent — August', amount: 1450, currency: 'USD', category: 'Fixed Expenses', date: iso(2026, 8, 3), taxable: false },
      { title: 'Software subscriptions — August', amount: 98, currency: 'USD', category: 'Fixed Expenses', date: iso(2026, 8, 5), taxable: false },
      { title: 'Marketing — local business directory', amount: 180, currency: 'USD', category: 'Variable Expenses', date: iso(2026, 8, 6), taxable: true },
    ]

    const expenseRows = recentExpenses.map((e) => {
      const isKes = e.currency === 'KES'
      const amountCents = isKes ? kes(e.amount) : usd(e.amount)
      const converted = isKes ? kesToUsdCents(amountCents) : amountCents
      return {
        user_id: userId,
        org_id: orgId,
        title: e.title,
        amount_cents: amountCents,
        currency: e.currency as 'USD' | 'KES',
        converted_amount_cents: converted,
        converted_currency: 'USD',
        exchange_rate_used: isKes ? 1 / USD_TO_KES_FALLBACK : 1,
        category_id: catId(e.category),
        date: e.date,
        notes: null,
        tax_applicable: e.taxable,
        is_taxable: e.taxable,
        tax_rate_used: e.taxable ? 16 : null,
        tax_amount_cents: e.taxable ? Math.round(amountCents * 0.16) : null,
        entry_type: 'expense',
        is_deleted: false,
      }
    })

    const { error: expError } = await supabase.from('expenses').insert(expenseRows)
    if (expError) throw new Error(`Expense insert failed: ${expError.message}`)
    console.log(`Inserted ${expenseRows.length} recent expenses`)
  }

  const { count: finalCount } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
  const { count: incomeTotal } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('entry_type', 'income')

  console.log(`\nDone. Carter Enterprises now has ${finalCount} transactions (${incomeTotal} income).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
