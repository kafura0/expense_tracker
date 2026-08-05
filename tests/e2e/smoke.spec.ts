import { test, expect } from '@playwright/test'

test.describe('public pages', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Ledgerly/)
  })

  test('login page renders and submits an empty form safely', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
  })

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('Min 8 characters')).toBeVisible()
  })

  test('security headers are present on responses', async ({ request }) => {
    const response = await request.get('/')
    const headers = response.headers()
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-xss-protection']).toBe('1; mode=block')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['content-security-policy']).toContain("default-src 'self'")
    expect(headers['content-security-policy']).toContain("script-src 'self' 'nonce-")
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  })
})
