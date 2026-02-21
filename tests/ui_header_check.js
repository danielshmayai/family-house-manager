const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch({ headless: true });
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
    const content = await page.content();
    console.log('PAGE CONTENT SNIPPET:\n', content.slice(0,2000));
    // check for sign out
    const hasSignOut = content.includes('Sign out') || content.includes('admin') || content.includes('Sign out'.toLowerCase());
    console.log('hasSignOut:', hasSignOut);
    await browser.close();
    process.exit(hasSignOut?0:2);
  }catch(e){
    console.error('error', e);
    await browser.close();
    process.exit(1);
  }
})()
