import { test, type Page } from '@playwright/test'

// DEMO RECORDING — produces one .webm per persona, walking every UI surface.
// Skipped unless DEMO_RECORD=1 (keeps CI / normal `playwright test` runs
// untouched). Videos land under test-results/; copy them out afterwards.
const RUN_DEMO = process.env.DEMO_RECORD === '1'
const BASE_MS = 1300

const CREDENTIALS = {
  admin: { email: 'admin@ledgerly.app', password: 'Admin@123456789!' },
  orgAdmin: { email: 'orgadmin@ledgerly.app', password: 'OrgAdmin@123!' },
  member: { email: 'manager@ledgerly.app', password: 'Manager@123!' },
  solo: { email: 'solo@ledgerly.app', password: 'Solo@123!' },
}

test.use({ video: 'on', viewport: { width: 1440, height: 900 } })

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function settle(page: Page, ms = BASE_MS) {
  await wait(ms)
}

async function scrollTo(page: Page, y: number) {
  await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'smooth' }), y)
  await settle(page, 900)
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }))
  await settle(page, 900)
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await settle(page, 1200)
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Enter your password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 45_000 })
  await settle(page, 2200)
}

async function nav(page: Page, label: string) {
  await page.getByRole('link', { name: label }).first().click()
  await settle(page, 1800)
}

async function openExpenseForm(page: Page) {
  await page.getByRole('button', { name: 'Add Expense', exact: true }).click()
  await settle(page, 800)
}

async function deleteExpense(page: Page, note: string) {
  await page.getByRole('button', { name: `Delete ${note}` }).click()
  await page
    .getByRole('dialog', { name: 'Delete Expense', exact: true })
    .getByRole('button', { name: 'Delete', exact: true })
    .click()
  await wait(2500)
}

test.describe('demo recording', () => {
  test.skip(!RUN_DEMO, 'set DEMO_RECORD=1 to enable')
  test.describe.configure({ mode: 'serial' })

  test('01 - public landing + auth pages', async ({ page }) => {
    test.setTimeout(300_000)
    await page.goto('/')
    await settle(page, 2500)
    await scrollTo(page, 700) // hero → features
    await scrollTo(page, 1600) // how it works
    await scrollTo(page, 2600) // pricing
    await scrollTo(page, 3400) // teams / CTA
    await scrollToBottom(page)
    await scrollTo(page, 0)

    for (const path of ['/login', '/signup', '/org-signup', '/verify-otp', '/reset-password', '/request-access']) {
      await page.goto(path)
      await settle(page, 1800)
    }
  })

  test('02 - solo user', async ({ page }) => {
    test.setTimeout(300_000)
    await login(page, CREDENTIALS.solo.email, CREDENTIALS.solo.password)

    await nav(page, 'Dashboard')
    await settle(page, 2500)
    await scrollTo(page, 900)
    await scrollTo(page, 0)

    await nav(page, 'Expenses')
    await settle(page, 1500)
    await openExpenseForm(page)
    await scrollTo(page, 400)
    await page.locator('#amount_cents').fill('2550')
    const note = `Demo expense ${Date.now()}`
    await page.locator('#notes').fill(note)
    await page.getByRole('button', { name: 'Create expense' }).click()
    await settle(page, 2200)
    await scrollTo(page, 0)
    await scrollTo(page, 500)
    await deleteExpense(page, note)

    await nav(page, 'Categories')
    await settle(page, 1200)
    await page.getByRole('button', { name: 'expense', exact: true }).click()
    await settle(page, 900)
    await page.getByRole('button', { name: 'income', exact: true }).click()
    await settle(page, 900)
    await page.getByRole('button', { name: 'all', exact: true }).click()
    await settle(page, 1200)
    await scrollTo(page, 600)
    await scrollTo(page, 0)

    await nav(page, 'Reports')
    await settle(page, 1800)
    await page.getByRole('button', { name: 'CSV', exact: true }).click()
    await settle(page, 2200)
    await scrollTo(page, 500)
    await scrollTo(page, 0)

    await nav(page, 'Settings')
    await settle(page, 1800)
    await scrollTo(page, 600)
    await scrollTo(page, 0)
  })

  test('03 - org member', async ({ page }) => {
    test.setTimeout(300_000)
    await login(page, CREDENTIALS.member.email, CREDENTIALS.member.password)

    await nav(page, 'Dashboard')
    await settle(page, 2500)
    await scrollTo(page, 900)
    await scrollTo(page, 1800)
    await scrollTo(page, 0)

    await nav(page, 'Expenses')
    await settle(page, 1500)
    await openExpenseForm(page)
    await settle(page, 900)
    await page.keyboard.press('Escape')
    await settle(page, 900)

    await nav(page, 'Categories')
    await settle(page, 1500)
    await page.getByRole('button', { name: 'income', exact: true }).click()
    await settle(page, 900)
    await page.getByRole('button', { name: 'all', exact: true }).click()
    await settle(page, 900)

    await nav(page, 'Reports')
    await settle(page, 1800)
    await scrollTo(page, 500)
    await scrollTo(page, 0)

    await nav(page, 'Settings')
    await settle(page, 1800)
    await page.getByRole('button', { name: 'Billing', exact: true }).click()
    await settle(page, 1800)
    await scrollTo(page, 600)
    await scrollTo(page, 0)
  })

  test('04 - org admin', async ({ page }) => {
    test.setTimeout(300_000)
    await login(page, CREDENTIALS.orgAdmin.email, CREDENTIALS.orgAdmin.password)

    await nav(page, 'Settings')
    await settle(page, 1800)
    await page.getByRole('button', { name: 'Members', exact: true }).click()
    await settle(page, 2200)
    await scrollTo(page, 500)
    await scrollTo(page, 900)
    await scrollTo(page, 0)

    await page.getByRole('button', { name: 'Organization', exact: true }).click()
    await settle(page, 1800)
    await scrollTo(page, 500)
    await scrollTo(page, 0)

    await page.getByRole('button', { name: 'Billing', exact: true }).click()
    await settle(page, 2000)
    await scrollTo(page, 600)
    await scrollTo(page, 0)

    await nav(page, 'Dashboard')
    await settle(page, 2500)
    await scrollTo(page, 900)
    await scrollTo(page, 0)

    await nav(page, 'Expenses')
    await settle(page, 1800)
  })

  test('05 - super admin panel', async ({ page }) => {
    test.setTimeout(300_000)
    await login(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password)
    await settle(page, 2500)

    const adminTabs = ['Users', 'Clients', 'Requests', 'Plans', 'Audit Logs', 'Invites', 'Announcements', 'Messages']
    for (const tab of adminTabs) {
      await page.getByRole('button', { name: new RegExp(`^${tab}`) }).click()
      await settle(page, 1600)
      await scrollTo(page, 700)
      await scrollTo(page, 0)
    }
  })
})
