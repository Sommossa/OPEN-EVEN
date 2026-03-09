import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER_ERROR:', err.toString()));
    
    await page.goto('http://localhost:3001/profile', { waitUntil: 'networkidle0' });
    
    await browser.close();
  } catch (err) {
    console.error("SCRIPT ERROR:", err);
  }
})();
