import { test, expect, type Page } from '@playwright/test'

// These tests exercise flows that mutate a real Supabase database through the
// running app, so they need live seeded data (a demo user with expenses).
// They are skipped unless E2E_FEATURE_RUN=1 is set. Point E2E_USER_EMAIL /
// E2E_USER_PASSWORD at any user; defaults to the seeded solo demo account.
const RUN_FEATURE_E2E = process.env.E2E_FEATURE_RUN === '1'
const USER_EMAIL = process.env.E2E_USER_EMAIL || 'solo@ledgerly.app'
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'Solo@123!'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(USER_EMAIL)
  await page.getByPlaceholder('Enter your password').fill(USER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/dashboard/)
  await page.goto('/expenses')
  await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible()
}

async function pickOption(page: Page, comboboxName: string, optionName: string) {
  await page.getByRole('combobox', { name: comboboxName }).click()
  await page.getByRole('option', { name: optionName, exact: true }).click()
}

// Row action buttons fade in on hover but are still interactive (and
// "visible" to Playwright) at opacity 0, so click straight through.
async function deleteRowsUntilGone(
  page: Page,
  matches: () => ReturnType<Page['getByRole']>,
  dialogName: string
) {
  let deletedAny = false
  for (let i = 0; i < 20; i++) {
    let before = 0
    if (!deletedAny) {
      // Wait out any loading skeleton / refetch window where the list is
      // briefly empty before deciding there is nothing left to delete.
      for (let wait = 0; wait < 32 && before === 0; wait++) {
        before = await matches().count()
        if (before === 0) await page.waitForTimeout(250)
      }
      if (before === 0) return
    } else {
      before = await matches().count()
      if (before === 0) return
    }
    deletedAny = true
    for (let attempt = 0; attempt < 3; attempt++) {
      if ((await matches().count()) !== before) break
      await matches().first().click()
      await page
        .getByRole('dialog', { name: dialogName, exact: true })
        .getByRole('button', { name: 'Delete', exact: true })
        .click()
      try {
        // Wait for the list refetch to drop this row before targeting the
        // next one. A slow server action can take 15s+, so be generous.
        await expect(matches()).toHaveCount(before - 1, { timeout: 45_000 })
        break
      } catch {
        // Delete may have failed server-side; the row is still there, so
        // retry the delete for this row.
      }
    }
  }
}

async function deleteExpensesByNotes(page: Page, note: string) {
  await deleteRowsUntilGone(
    page,
    () => page.getByRole('button', { name: `Delete ${note}` }),
    'Delete Expense'
  )
}

async function deleteRecurringTemplate(page: Page, desc: string) {
  await deleteRowsUntilGone(
    page,
    () => page.getByRole('button', { name: `Delete ${desc}` }),
    'Delete Recurring Expense'
  )
}

async function deleteAllRecurringTemplates(page: Page) {
  await expect(page.getByRole('heading', { name: 'Recurring expenses' })).toBeVisible()
  await deleteRowsUntilGone(
    page,
    () => page.getByRole('button', { name: /Delete E2E Recurring / }),
    'Delete Recurring Expense'
  )
}

async function purgeExpensesBySearch(page: Page, query: string, namePattern: RegExp) {
  await page.getByPlaceholder('Search expenses by notes...').fill(query)
  // Let the filtered refetch land before counting rows.
  await page.waitForTimeout(2500)
  for (let p = 0; p < 20; p++) {
    const loc = () => page.getByRole('button', { name: namePattern })
    if ((await loc().count()) === 0) {
      const next = page.getByRole('button', { name: 'Next page' })
      if ((await next.count()) === 0 || !(await next.isEnabled())) break
      await next.click()
      await page.waitForTimeout(1500)
      continue
    }
    await deleteRowsUntilGone(page, loc, 'Delete Expense')
  }
  await page.getByPlaceholder('Search expenses by notes...').fill('')
}

// Failed runs can leave E2E expenses and recurring templates behind. Purge
// them up front so leftover templates can't keep materializing expenses and
// leftover rows can't slow the list refetch that drives the delete buttons.
async function purgeLeftoverE2EData(page: Page) {
  // Let the page's initial queries (expenses list + recurring section) settle
  // so the purge doesn't run against a loading skeleton.
  await page.waitForTimeout(2500)
  await deleteAllRecurringTemplates(page)
  await purgeExpensesBySearch(page, 'E2E Recurring', /Delete Recurring · E2E Recurring /)
  await purgeExpensesBySearch(page, 'E2E Receipt', /Delete E2E Receipt /)
}

test.describe('live feature flows', () => {
  test.skip(!RUN_FEATURE_E2E, 'set E2E_FEATURE_RUN=1 to enable')
  test.describe.configure({ mode: 'serial', timeout: 420_000 })

  test('recurring template materializes due expenses on page load', async ({ page }) => {
    const desc = `E2E Recurring ${Date.now()}`
    await login(page)
    await purgeLeftoverE2EData(page)

    // Create a monthly template whose start date is ~4 months in the past so
    // the next page load has overdue periods to materialize.
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.locator('#recurring-description').fill(desc)
    await page.locator('#recurring-amount').fill('1234')
    const startStr = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    await page.locator('#recurring-start').fill(startStr)
    await pickOption(page, 'Frequency', 'Monthly')
    await page.getByRole('button', { name: 'Create Recurring' }).click()

    await expect(page.getByText(desc, { exact: true })).toBeVisible()

    // Reload: the page materializes every overdue period into an expense.
    await page.reload()
    await page.getByPlaceholder('Search expenses by notes...').fill(desc)
    const note = `Recurring · ${desc}`
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 20_000 })

    // Cleanup: delete the materialized expenses, then the template.
    await deleteExpensesByNotes(page, note)
    await deleteRecurringTemplate(page, desc)
  })

  test('receipt upload and delete round-trips', async ({ page }) => {
    const note = `E2E Receipt ${Date.now()}`
    await login(page)
    await purgeLeftoverE2EData(page)

    // Create an expense to attach a receipt to.
    await page.getByRole('button', { name: 'Add Expense' }).click()
    await page.locator('#amount_cents').fill('1234')
    await page.locator('#notes').fill(note)
    await page.getByRole('button', { name: 'Create expense' }).click()

    // Open its receipts dialog. The note text can also appear in a mounted
    // (closed) dialog tree, so scope to the table row.
    const notesCell = page.getByRole('table').getByText(note, { exact: true })
    await expect(notesCell).toBeVisible()
    await notesCell.hover()
    await page.getByRole('button', { name: `Receipts for ${note}` }).click()
    await expect(page.getByText('No receipts yet')).toBeVisible()

    // Upload a tiny valid PNG.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )
    await page.locator('input[type="file"]').setInputFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: png,
    })

    await expect(page.getByText('receipt.png')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete receipt.png' })).toBeVisible()

    // Delete the receipt; the dialog returns to its empty state.
    await page.getByRole('button', { name: 'Delete receipt.png' }).click()
    await expect(page.getByText('No receipts yet')).toBeVisible()

    // Cleanup: close the dialog and delete the expense.
    await page.keyboard.press('Escape')
    await deleteExpensesByNotes(page, note)
  })
})
