import { test, expect } from '@playwright/test'

const ROUTES: Array<{ path: string; selector?: string }> = [
  { path: '/login', selector: '[placeholder="you@example.com"]' },
  { path: '/signup', selector: '[placeholder="Min 8 characters"]' },
  { path: '/org-signup', selector: '[placeholder="Acme Corp"]' },
  { path: '/request-access', selector: '[placeholder="+1 (555) 000-0000"]' },
  { path: '/reset-password', selector: '[placeholder="you@example.com"]' },
  { path: '/update-password' },
  { path: '/verify-otp' },
  { path: '/invite' },
  { path: '/no-access' },
  { path: '/suspended' },
]

for (const { path, selector } of ROUTES) {
  test(`public route renders: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveTitle(/Ledgerly/)
    if (selector) {
      await expect(page.locator(selector)).toBeVisible()
    }
  })
}
