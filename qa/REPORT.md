# QA Test Report — AURA / AI Self Learning University

**Target:** https://aifluencyprocenter.replit.app
**Build:** Vite + React SPA, bundle `index-BluzdytS.js` (≈540 KB)
**Date of run:** 2026-06-11
**Method:** Automated end-to-end testing with Playwright + Chromium against the live
deployment, authenticated as a real learner account. 36 routes and 25+ API endpoints
exercised across health, functional, security, accessibility and responsive dimensions.

---

## Executive summary

The application is in **good overall shape**. Every one of the 36 routes returns HTTP
200 and renders without JavaScript errors; the lesson player, flashcards, daily
challenge, leaderboard, community and settings flows all work; accessibility and
mobile-responsive baselines are strong; and most API endpoints correctly enforce
server-side authorization.

Two issues stand out and should be addressed before a wider roll-out:

1. **Unauthenticated data exposure** — `/api/leaderboard` and `/api/community-prompts`
   return real data (employee display names, internal user UUIDs, XP) to anyone on the
   internet with no login.
2. **No logout control in the UI** — the `/api/auth/logout` endpoint exists and works,
   but no button anywhere in the app invokes it. On shared/enterprise machines a user
   cannot sign out.

---

## Severity-ranked findings

### S1 — High: Leaderboard & community APIs leak data without authentication
`GET /api/leaderboard` returns **200** with 20 real records to an unauthenticated
client. Each record exposes `userId` (internal UUID), `displayName` (real employee
name), `totalXp`, `currentLevel`, `streak`. `GET /api/community-prompts` likewise
returns 200 with user-generated prompt content and author identities.

Every other endpoint tested (`/api/user/*`, `/api/lessons/*`, `/api/daily-challenge`,
`/api/notifications`, `/api/auth/user`) correctly returns **401 Unauthorized**, which
shows the auth middleware exists and these two routes are simply missing it.

For an enterprise platform carrying Novartis employee names this is a privacy concern
(name + internal ID enumeration). The page routes `/leaderboard` and `/community` also
render for unauthenticated visitors, consistent with the missing API guard.
**Recommendation:** require an authenticated session on both endpoints; if a public
leaderboard is intended, return anonymized/aggregated data only.

### S2 — Medium: No logout / sign-out affordance in the UI
There is no "Log out" or "Sign out" control on `/settings`, in the header, or behind the
profile avatar (clicking the avatar navigates to `/settings`, it does not open a menu).
`POST /api/auth/logout` returns 200 when called directly, so only the UI wiring is
missing. **Recommendation:** add a sign-out action to the settings page and/or a
profile menu.

### S3 — Medium: Authentication rate limiter is very aggressive
The login rate limiter returns **429 "Too many authentication attempts"** after only
~2–3 failed attempts from one IP, and the limit also applies to `GET /api/auth/user`.
A legitimate user who mistypes their password twice can be locked out, and the limit
can be tripped for an entire shared corporate egress IP. Rate limiting is good and
should stay — but consider a higher threshold, per-account rather than per-IP scoping,
and excluding the session-check endpoint. (Generic "Invalid email or password" messaging
on a genuine wrong password is correct and was verified.)

### S4 — Low: Leaderboard time filters may not change the dataset
The `/leaderboard` page exposes **All time / Week / Month** filters, but `/api/leaderboard`
takes no period parameter and the top entry is identical across all three. The filters
are clickable but may not actually re-scope the data by period. **Recommendation:** verify
the filters query period-scoped data, or remove them if not implemented.

### S5 — Low (cosmetic): Emoji display names break avatar initials
A user with an emoji in their display name ("Jacek 😎") renders the avatar initial as
`J�` (broken surrogate). Derive initials with code-point-aware logic.

### S6 — Low: Replit feedback widget blocked by the app's own CSP
The page's `script-src 'self'` Content-Security-Policy blocks
`https://replit-cdn.com/feedback-widget/widget.global.js`, producing a console error on
every page. Harmless functionally (and the CSP is actually a *good* sign), but it's noise
— either allow the widget's origin in the CSP or remove the widget tag in production.

### Informational
- `/test-dashboard` ("Live end-to-end testing") is reachable by any logged-in user.
  Consider gating it to admins or removing it from production.
- `/certificate/:hash` correctly shows a friendly "Certificate Not Found" page for an
  invalid hash; the underlying `GET /api/certificates/verify/:hash` 404 surfaces as a
  console error (expected, but noisy).

---

## What passed (verified working)

| Area | Result |
|------|--------|
| Route health (36 routes) | All HTTP 200, all render, **zero app JS errors** |
| Authentication (happy path) | Login → `/home`, session persists |
| Auth validation | Wrong password → 401 generic message; empty/invalid email → client validation |
| Protected routes | `/home`, `/settings`, `/achievements`, `/lesson/*` redirect to login when logged out |
| API authorization | 8/10 sensitive endpoints return 401 unauthenticated (see S1 for the 2 exceptions) |
| Admin access control | `/admin`, `/enterprise`, `/enterprise-admin`, `/leadership` show "Not authorized" |
| 404 handling | Unknown routes render a proper "Page Not Found" page |
| Lesson player (`/lesson/2`) | Rich content, module/level navigation, no errors |
| Flashcards review | Cards load, tap-to-reveal works |
| Daily challenge | Prompt + textarea + "Submit for AI Evaluation" present |
| Leaderboard | Renders 20 ranked users; time filters clickable (see S4) |
| Community / Connect | Render fully with prompt content |
| Settings | Profile, language, **Export My Data** and **Delete Account** (GDPR-friendly) present |
| Registration page | firstName/lastName/email/password/confirm fields; "required" validation fires |
| Accessibility | No missing alt text, no unlabeled buttons/inputs, `lang=en`, single `<h1>`, skip link, no duplicate IDs |
| Mobile responsive (390×844) | No horizontal scroll on any page tested; nav present |

---

## Test inventory
- **Route health & rendering:** 36 routes (every router path in the bundle, plus a 404 probe)
- **API authorization:** 10 endpoints, authenticated vs. unauthenticated
- **Auth negative/validation:** wrong password, empty fields, malformed email, nonexistent
  user, injection-style password, rate-limit behavior
- **Functional flows:** lesson player, flashcards, daily challenge, leaderboard filters,
  community, settings, registration validation
- **Non-functional:** accessibility heuristics (3 pages), mobile responsive (5 pages),
  console-error and 4xx/5xx network monitoring on every navigation

## Notes / limitations
- Run from a sandbox behind a TLS-intercepting proxy, so the browser context uses
  `ignoreHTTPSErrors` — the live site's own certificate was not independently validated.
- Tests were deliberately **non-destructive**: no community posts, challenge submissions,
  profile edits, or account deletion were performed against the live account.
- Deep, content-level correctness of all 220 lessons was not exhaustively checked; the
  lesson *engine* was verified on representative levels.
