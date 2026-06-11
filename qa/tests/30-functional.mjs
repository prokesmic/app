// Functional smoke of the core learning flows (read-only; creates no data).
import { chromium } from 'playwright';
import { BASE, CTX, isAppError } from './config.mjs';

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...CTX, storageState: 'state.json' });
const page = await ctx.newPage();

async function go(p) {
  const errs = [];
  const h = m => { const t = m.text(); if (m.type() === 'error' && isAppError(t)) errs.push(t.slice(0, 90)); };
  page.on('console', h);
  try { await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 30000 }); } catch {}
  await page.waitForTimeout(1500);
  page.off('console', h);
  return errs;
}

// Lesson player
let e = await go('/lesson/2');
const lesson = await page.evaluate(() => document.body.innerText.length);
console.log(`Lesson /lesson/2: textLen=${lesson} jsErrors=${e.length} -> ${lesson > 500 && e.length === 0 ? 'PASS' : 'WARN'}`);

// Leaderboard time filters
await go('/leaderboard');
for (const f of ['All time', 'Week', 'Month']) {
  try {
    await page.getByText(f, { exact: true }).first().click({ timeout: 4000 });
    await page.waitForTimeout(900);
    console.log(`Leaderboard filter "${f}": clickable -> PASS`);
  } catch { console.log(`Leaderboard filter "${f}": FAIL`); }
}

// Flashcards reveal
await go('/flashcards/review');
try {
  const reveal = page.locator('button', { hasText: /reveal|show|flip/i }).first();
  await reveal.click({ timeout: 4000 });
  console.log('Flashcards reveal: PASS');
} catch { console.log('Flashcards reveal: no reveal button (empty due queue?)'); }

// Daily challenge presence of submission affordance
e = await go('/daily-challenge');
const dc = await page.evaluate(() => ({ hasInput: !!document.querySelector('textarea,input[type=text]'),
  hasSubmit: !![...document.querySelectorAll('button')].find(b => /submit/i.test(b.innerText)) }));
console.log(`Daily challenge: inputField=${dc.hasInput} submitButton=${dc.hasSubmit} jsErrors=${e.length}`);

// Settings controls
e = await go('/settings');
const st = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean));
console.log('Settings controls:', JSON.stringify(st.slice(0, 10)));
console.log('Logout control present on /settings:', /log ?out|sign ?out/i.test(st.join(' ')));

await browser.close();
