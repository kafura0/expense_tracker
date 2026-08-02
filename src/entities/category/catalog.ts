/**
 * Ledgerly standard category catalog.
 *
 * The expense form presents this fixed taxonomy (sitewide) instead of
 * whatever categories exist in the DB. On save, the selected catalog category
 * is matched to a `categories` row by name (created on demand when missing).
 */

export type CategoryKind = 'income' | 'expense'

export interface CategoryOption {
  /** Stable slug used as the form's select value. */
  key: string
  kind: CategoryKind
  name: string
  description: string
  icon: string
  color: string
}

export const CATEGORY_CATALOG: CategoryOption[] = [
  // ── Income categories ──────────────────────────────────────────────
  {
    key: 'earned-income',
    kind: 'income',
    name: 'Earned Income',
    description: 'Money from a main job — salary, hourly wages, overtime, tips, or bonuses.',
    icon: 'briefcase',
    color: '#34d399',
  },
  {
    key: 'side-hustle-income',
    kind: 'income',
    name: 'Side Hustle Income',
    description: 'Extra money from freelance work, a second job, or a small business.',
    icon: 'monitor',
    color: '#818cf8',
  },
  {
    key: 'passive-income',
    kind: 'income',
    name: 'Passive Income',
    description: 'Money made with little work — rental property earnings, royalties, or digital product sales.',
    icon: 'home',
    color: '#38bdf8',
  },
  {
    key: 'portfolio-income',
    kind: 'income',
    name: 'Portfolio Income',
    description: 'Returns from investments — stock dividends, interest from savings, or capital gains.',
    icon: 'trending-up',
    color: '#f59e0b',
  },
  {
    key: 'other-income',
    kind: 'income',
    name: 'Other Income',
    description: 'Government benefits, child support, gifts, or tax refunds.',
    icon: 'misc',
    color: '#94a3b8',
  },
  // ── Expense categories ─────────────────────────────────────────────
  {
    key: 'fixed-expenses',
    kind: 'expense',
    name: 'Fixed Expenses',
    description: 'Bills that stay the same every month — rent or mortgage, car insurance, and internet.',
    icon: 'wifi',
    color: '#a78bfa',
  },
  {
    key: 'variable-expenses',
    kind: 'expense',
    name: 'Variable Expenses',
    description: 'Costs that change month to month — groceries, dining out, electricity, and fuel.',
    icon: 'groceries',
    color: '#34d399',
  },
  {
    key: 'healthcare-personal',
    kind: 'expense',
    name: 'Healthcare & Personal',
    description: 'Out-of-pocket doctor visits, medicines, gym memberships, and haircuts.',
    icon: 'medical',
    color: '#f472b6',
  },
  {
    key: 'debt-savings',
    kind: 'expense',
    name: 'Debt & Savings',
    description: 'Credit card bills, student loan payments, emergency fund deposits, and retirement savings.',
    icon: 'piggy-bank',
    color: '#facc15',
  },
  {
    key: 'discretionary-wants',
    kind: 'expense',
    name: 'Discretionary / Wants',
    description: 'Entertainment, hobbies, vacations, and shopping for non-essential items.',
    icon: 'music',
    color: '#fb7185',
  },
]

export function categoryCatalogByKind(kind: CategoryKind): CategoryOption[] {
  return CATEGORY_CATALOG.filter((c) => c.kind === kind)
}

export function findCatalogCategory(key: string): CategoryOption | undefined {
  return CATEGORY_CATALOG.find((c) => c.key === key)
}

export function findCatalogCategoryByName(name: string): CategoryOption | undefined {
  return CATEGORY_CATALOG.find((c) => c.name.toLowerCase() === name.toLowerCase())
}
