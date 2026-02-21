const { chromium } = require('playwright')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const HEADLESS = !(process.env.PLAYWRIGHT_HEADLESS === '0' || process.env.PLAYWRIGHT_HEADLESS === 'false')

async function run() {
  const browser = await chromium.launch({ headless: !!HEADLESS })
  const page = await (await browser.newContext()).newPage()
  try {
    const r = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
    if (!r || r.status() >= 400) {
      console.error('ERR: bad response', r && r.status())
      await browser.close()
      process.exit(1)
    }
    console.log('OK: visited', BASE_URL, 'status', r.status())
  } catch (e) {
    console.error('ERR: visit failed', e.message)
    await browser.close()
    process.exit(1)
  }
  await browser.close()
  process.exit(0)
}

run()
