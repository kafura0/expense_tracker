import { chromium } from 'playwright'

const url = 'http://localhost:3000/'

const shots = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
]

const browser = await chromium.launch()
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } })
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `public/screenshots/${shot.name}.png`, fullPage: false })
  await page.close()
  console.log(`captured ${shot.name}`)
}
await browser.close()
