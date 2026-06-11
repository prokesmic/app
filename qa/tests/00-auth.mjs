// Logs into AURA and saves an authenticated storage state for the other suites.
import { chromium } from 'playwright';
import { BASE, EMAIL, PASSWORD, CTX } from './config.mjs';

if (!EMAIL || !PASSWORD) {
  console.error('Set AURA_EMAIL and AURA_PASSWORD environment variables first.');
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext(CTX);
const page = await ctx.newPage();

await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 45000 });
await page.fill('input[name=email]', EMAIL);
await page.fill('input[name=password]', PASSWORD);
await page.getByRole('button', { name: /^sign in$/i }).last().click();
await page.waitForTimeout(5000);

const path = new URL(page.url()).pathname;
if (path === '/login') {
  console.error('Login appears to have failed (still on /login).');
  process.exit(2);
}
await ctx.storageState({ path: 'state.json' });
console.log('Login OK — landed on', path, '— saved state.json');
await browser.close();
