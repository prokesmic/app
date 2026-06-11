// Security checks:
//  1. Protected routes redirect to /login when unauthenticated.
//  2. API endpoints enforce server-side authorization (expect 401 without a session).
//  3. Reports any endpoint that leaks data unauthenticated.
import { chromium } from 'playwright';
import { BASE, CTX } from './config.mjs';

const PROTECTED_ROUTES = ['/home', '/settings', '/achievements', '/lesson/2', '/leaderboard', '/community'];
const API = ['/api/auth/user', '/api/leaderboard', '/api/user/progress', '/api/lessons/meta',
  '/api/lessons/2', '/api/daily-challenge', '/api/community-prompts', '/api/notifications',
  '/api/user/sessions', '/api/user/analytics'];

const browser = await chromium.launch();

console.log('=== PROTECTED ROUTE ENFORCEMENT (no session) ===');
{
  const ctx = await browser.newContext(CTX);
  const page = await ctx.newPage();
  for (const p of PROTECTED_ROUTES) {
    try { await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 20000 }); } catch {}
    await page.waitForTimeout(900);
    const url = new URL(page.url()).pathname;
    const redirectedToAuth = /\/login|\/auth/.test(url);
    console.log(`  ${redirectedToAuth ? 'OK  ' : 'LEAK'} ${p} -> ${url}`);
  }
  await ctx.close();
}

console.log('\n=== UNAUTHENTICATED API AUTHZ (expect 401) ===');
{
  const ctx = await browser.newContext(CTX);
  const page = await ctx.newPage();
  for (const e of API) {
    const res = await page.request.get(BASE + e, { ignoreHTTPSErrors: true }).catch(() => null);
    if (!res) { console.log('  request failed ' + e); continue; }
    const flag = res.status() === 401 ? 'OK  ' : (res.status() === 200 ? 'LEAK' : '    ');
    let body = ''; try { body = (await res.text()).slice(0, 70).replace(/\s+/g, ' '); } catch {}
    console.log(`  ${flag} ${res.status()} GET ${e} | ${body}`);
  }
  await ctx.close();
}
await browser.close();
