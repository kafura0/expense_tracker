import { test, expect } from '@playwright/test'

const PROTECTED = ['/dashboard', '/expenses', '/reports', '/categories', '/settings', '/admin']

for (const path of PROTECTED) {
  test(`unauthenticated ${path} redirects to /login`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers()['location']).toMatch(/\/login$/)
  })
}

test('unauthenticated API route redirects to /login', async ({ request }) => {
  const response = await request.get('/api/rates', { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  expect(response.headers()['location']).toMatch(/\/login$/)
})
