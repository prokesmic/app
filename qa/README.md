# AURA — AI Self Learning University: Automated QA Suite

End-to-end browser test harness for the **AI Self Learning University (AURA)** /
Novartis AI Fluency Platform deployed at `https://aifluencyprocenter.replit.app`.

Built with [Playwright](https://playwright.dev) + Chromium. The suite logs into the
live app, crawls the route map extracted from the JS bundle, and runs health,
functional, security, accessibility and responsive checks.

> Note: this harness targets the **live AURA deployment**, which is a separate
> codebase from the app in this repository. It lives here because this is where the
> testing engagement was run from.

## Setup

```bash
cd qa
npm install
npx playwright install chromium
```

## Configure credentials

The login step reads credentials from environment variables (never commit them):

```bash
export AURA_EMAIL="you@novartis.com"
export AURA_PASSWORD="********"
```

## Run

```bash
node tests/00-auth.mjs        # logs in, saves state.json (gitignored)
node tests/10-routes.mjs      # health-check every route, screenshots
node tests/20-security.mjs    # protected-route + unauthenticated API authz
node tests/30-functional.mjs  # lesson / flashcards / leaderboard / settings
node tests/40-a11y-mobile.mjs # accessibility scan + mobile responsive
```

Artifacts (`state.json`, `shots/`, `bundle.js`, `*-result.json`) are gitignored.

## What the run found

See [`REPORT.md`](./REPORT.md) for the full findings from the engagement
(2026-06-11), including the unauthenticated leaderboard/community data exposure
and the missing logout control.
