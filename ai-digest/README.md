# ai-digest

A daily agent that finds the top AI articles, essays, announcements, papers, and
posts you'd actually want to read — and saves them to your **Readwise Reader**.
It runs **twice a day** and learns your taste from the AI podcasts you listen to
and the authors you follow.

This is a standalone project; it shares the repo but is independent of the app at
the repository root.

## How it works

```
[COLLECT] → [DEDUP + MERGE] → [PREFILTER] → [LLM RERANK] → [TOP N] → [READWISE]
                                                ▲
                                       [TASTE PROFILE]  ← built from ~30 days of
                                                           your podcasts + authors
```

1. **Collect** — pulls from RSS (authors, labs, papers, podcasts), the Hacker News
   front page (AI-filtered), and mines *cited links* out of annotated podcast show
   notes (e.g. Latent Space). See `src/config.ts`.
2. **Dedup + merge** — canonicalizes URLs and merges duplicates; an item surfaced by
   several sources gets a corroboration boost.
3. **Taste profile** — `bootstrap` reads ~30 days of your podcasts + author feeds and
   has Claude infer the topics, keywords, authors, and domains you care about
   (`state/taste-profile.json`). Refresh anytime with `--refresh-profile`.
4. **Prefilter → rerank** — a transparent heuristic narrows the pool, then Claude
   reranks the survivors against your taste profile and writes a one-line
   "why you'll care" for each.
5. **Deliver** — saves the top N to Readwise Reader, tagged and annotated.
   `state/seen.json` guarantees nothing is ever sent twice (across both daily runs).

If `ANTHROPIC_API_KEY` is unset, it falls back to the heuristic ranker and a seed
taste profile, so it still runs end-to-end (useful for testing).

## Sources

Followed authors: **Karpathy**, **Ethan Mollick** (One Useful Thing), **Citrini Research**,
**Simon Willison**, **Interconnects** (Nathan Lambert), **Import AI** (Jack Clark),
**Ahead of AI** (Sebastian Raschka), **Don't Worry About the Vase** (Zvi).
Labs: **OpenAI**, **Google DeepMind**, **Hugging Face**. Papers: **arXiv** (cs.AI/LG/CL).
Aggregator: **Hacker News**.
Podcasts (taste signal + cited-link mining where useful): **Latent Space**,
**Last Week in AI**, **The AI Daily Brief**, **Everyday AI**, **The Artificial Intelligence Show**.

Add or reweight any source in `src/config.ts`.

### Engagement feedback loop

When `READWISE_TOKEN` is set, each run pulls your existing Reader library to (1) avoid
recommending anything you've already saved and (2) learn from what you've **archived or
read** — those titles become a positive signal the next time the taste profile is built
(`--refresh-profile`). Disable with `READWISE_FEEDBACK=0`.

### X/Twitter (optional, off by default)

Reading tweets (e.g. Matt Shumer, Jack Dorsey) requires a paid X API or a self-hosted
**RSSHub** instance. Set `X_RSSHUB_BASE` to your RSSHub URL to pull posts from
`X_HANDLES`; leave it blank and the X collector is a no-op (no cost). Karpathy's and
Mollick's essays already arrive via their RSS feeds regardless.

## Setup

```bash
cd ai-digest
npm install
cp .env.example .env   # then fill in the values
```

Get a **Readwise token** at https://readwise.io/access_token and (optionally) an
**Anthropic API key**. Put them in `.env`:

```
READWISE_TOKEN=...
ANTHROPIC_API_KEY=...        # optional but recommended for quality ranking
DIGEST_MODEL=claude-opus-4-7 # set to claude-haiku-4-5 to cut cost
DIGEST_LIMIT=10              # items per run (×2 runs/day)
READWISE_LOCATION=feed       # new | later | archive | feed
```

## Usage

```bash
npm run bootstrap     # build the taste profile (run once; re-run to refresh)
npm run dry-run       # collect + rank + print top N, save nothing
npm run digest        # the real thing: rank + save top N to Readwise
npm run collect       # diagnostic: print collected candidates
```

## Scheduling (twice daily)

The included GitHub Actions workflow (`.github/workflows/ai-digest.yml`) runs the
digest twice a day and commits the updated `state/` back to the branch (zero
external infrastructure). To enable it:

1. Repo **Settings → Secrets and variables → Actions**:
   - Secrets: `READWISE_TOKEN`, `ANTHROPIC_API_KEY`
   - (optional) Variables: `DIGEST_MODEL`, `DIGEST_LIMIT`, `READWISE_LOCATION`, `READWISE_TAGS`
2. Adjust the two `cron` times (UTC) in the workflow to your morning/evening.
3. Use **Run workflow** (workflow_dispatch) to trigger manually, with optional
   `dry_run` / `refresh_profile` toggles.

## Cost

- Ranking + taste extraction: a few cents/day on Claude (less on Haiku). One LLM
  call per run reranks ~40 candidates; the taste profile is the cached prefix.
- Everything else (RSS, HN, Readwise) is free.

## Roadmap

Done since v1:
- ✅ **More sources** — added Simon Willison, Interconnects, Import AI, Ahead of AI,
  Zvi, Google DeepMind, Hugging Face, and Last Week in AI.
- ✅ **Feedback loop** — engagement-aware dedup + taste enrichment from your Reader library.
- ✅ **X/Twitter** — pluggable RSSHub-backed collector (off until configured).

Still open:
- **Audio transcription**: for podcasts whose show notes lack cited links (AI Daily
  Brief, Everyday AI), transcribe via YouTube captions or Deepgram/Whisper to mine
  spoken citations and enrich the taste profile. Needs `yt-dlp`/an ASR key, so it's
  left as an explicit setup step rather than shipped half-wired.
- **GitHub trending** and Anthropic/Meta blogs (no official RSS — need a mirror).
