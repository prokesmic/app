// Accessibility heuristics + mobile-responsive smoke.
import { chromium } from 'playwright';
import { BASE, CTX } from './config.mjs';

const browser = await chromium.launch();

console.log('=== MOBILE RESPONSIVE (390x844) ===');
{
  const ctx = await browser.newContext({ ...CTX, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: 'state.json' });
  const page = await ctx.newPage();
  for (const p of ['/home', '/learn', '/lesson/2', '/community', '/leaderboard']) {
    await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const de = document.documentElement;
      return { overflowX: de.scrollWidth > de.clientWidth, hasNav: !!document.querySelector('nav,[role=navigation]') };
    });
    console.log(`  ${p}: horizontalScroll=${info.overflowX} nav=${info.hasNav} -> ${info.overflowX ? 'WARN' : 'OK'}`);
  }
  await ctx.close();
}

console.log('\n=== ACCESSIBILITY HEURISTICS ===');
{
  const ctx = await browser.newContext({ ...CTX, storageState: 'state.json' });
  const page = await ctx.newPage();
  for (const p of ['/home', '/learn', '/lesson/2']) {
    await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);
    const a = await page.evaluate(() => {
      const imgsNoAlt = [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length;
      const btnsNoName = [...document.querySelectorAll('button')].filter(b => !(b.innerText.trim() || b.getAttribute('aria-label') || b.querySelector('svg title'))).length;
      const inputsNoLabel = [...document.querySelectorAll('input,select,textarea')].filter(i => {
        const lbl = i.id && document.querySelector(`label[for="${i.id}"]`);
        return !(lbl || i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || i.closest('label'));
      }).length;
      const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
      const dupIds = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
      return { imgsNoAlt, btnsNoName, inputsNoLabel, lang: document.documentElement.getAttribute('lang'),
               h1: document.querySelectorAll('h1').length, dupIds, skipLink: !!document.querySelector('a[href^="#"]') };
    });
    console.log(`  ${p}: imgsNoAlt=${a.imgsNoAlt} btnsNoName=${a.btnsNoName} inputsNoLabel=${a.inputsNoLabel} lang=${a.lang} h1=${a.h1} dupIds=${a.dupIds.length} skipLink=${a.skipLink}`);
  }
  await ctx.close();
}
await browser.close();
