const { chromium } = require('playwright');

(async ()=>{
  const headless = !(process.env.PLAYWRIGHT_HEADLESS === '0' || process.env.PLAYWRIGHT_HEADLESS === 'false')
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  const BASE = 'http://localhost:3000'
  try{
    await page.goto(BASE + '/auth/login', { waitUntil: 'networkidle' });
    await page.fill('input[type=email]', 'admin@demo.com');
    await page.fill('input[type=password]', 'password');
    await page.click('button[type=submit]');
    await page.waitForTimeout(1500);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    // click first quick action
    const q = await page.$('.quick-card');
    if (!q) { console.error('no quick card found'); process.exit(2) }
    await q.click();
    await page.waitForTimeout(1000);
    // check for alert dialog? Playwright can't read native alert easily; instead check events list
    const timeline = await page.$('.events');
    const txt = await timeline.innerText();
    console.log('timeline text snippet:', txt.slice(0,200));
    await browser.close();
    process.exit(0);
  }catch(e){
    console.error('error', e);
    await browser.close();
    process.exit(1);
  }
})()
