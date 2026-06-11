// Health-checks every route (extracted from the production JS bundle's router):
// HTTP status, render success, console errors, 4xx/5xx network calls, screenshot.
import { chromium } from 'playwright';
import fs from 'fs';
import { BASE, CTX, isAppError } from './config.mjs';

const ROUTES = [
  '/home', '/dashboard', '/learn', '/learning-paths', '/my-path', '/lesson/2', '/lesson/1',
  '/flashcards', '/flashcards/2', '/flashcards/review', '/daily-challenge', '/achievements',
  '/leaderboard', '/community', '/connect', '/competencies', '/architecture', '/tools',
  '/discover', '/assessment', '/pre-assessment', '/onboarding', '/track-setup', '/settings',
  '/certificate/abc123', '/tier-complete/knowledge', '/faqs', '/privacy', '/terms',
  '/admin', '/enterprise', '/enterprise-admin', '/manager', '/leadership', '/test-dashboard',
  '/nonexistent-xyz',
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...CTX, storageState: 'state.json' });
const page = await ctx.newPage();
fs.mkdirSync('shots', { recursive: true });
const results = [];

for (const r of ROUTES) {
  const errs = [], nets = [];
  const onC = m => { const t = m.text(); if (m.type() === 'error' && isAppError(t)) errs.push(t.slice(0, 140)); };
  const onP = e => errs.push('PAGEERR:' + e.message.slice(0, 140));
  const onR = resp => { const u = resp.url(); if (resp.status() >= 400 && u.includes('replit.app') && isAppError(u)) nets.push(resp.status() + ' ' + resp.request().method() + ' ' + u.replace(BASE, '').slice(0, 70)); };
  page.on('console', onC); page.on('pageerror', onP); page.on('response', onR);

  let status = '?';
  try { const resp = await page.goto(BASE + r, { waitUntil: 'networkidle', timeout: 30000 }); status = resp ? resp.status() : '?'; }
  catch (e) { status = 'ERR:' + e.message.slice(0, 30); }
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => {
    const root = document.getElementById('root');
    const txt = document.body.innerText || '';
    return { rootChildren: root ? root.children.length : 0, textLen: txt.length,
             h1: document.querySelector('h1')?.innerText?.slice(0, 60) || '',
             firstText: txt.replace(/\s+/g, ' ').trim().slice(0, 90) };
  });
  const finalPath = new URL(page.url()).pathname;
  await page.screenshot({ path: 'shots/' + r.replace(/[\/:]/g, '_') + '.png' }).catch(() => {});
  results.push({ route: r, status, finalPath, redirected: finalPath !== r, ...info, errs, nets });
  console.log(`${status}\t${r}${finalPath !== r ? ' -> ' + finalPath : ''}\ttextLen=${info.textLen}${errs.length ? ' ERRS=' + errs.length : ''}${nets.length ? ' NET=' + nets.length : ''}`);
  page.off('console', onC); page.off('pageerror', onP); page.off('response', onR);
}

fs.writeFileSync('routes-result.json', JSON.stringify(results, null, 1));
await browser.close();
