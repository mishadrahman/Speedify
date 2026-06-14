import { chromium } from 'playwright';
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('https://mishadrahman.github.io/Speedify/');
  await page.click('button:has-text("Play")'); // Try to find the play button, wait no, let's just log
  await new Promise(r => setTimeout(r, 15000));
  await browser.close();
}
run().catch(console.error);
