# ai-digest

A daily agent that finds the top AI articles, essays, announcements, papers, and
posts you'd actually want to read — and saves them to your **Readwise Reader**.
It runs **twice a day on your Mac Mini** and learns your taste from the AI podcasts
you listen to and the authors you follow. Ranking runs on a **local Gemma model via
[Ollama](https://ollama.com)** — no cloud LLM, no per-token cost.

This is a standalone project; it shares the repo but is independent of the app at
the repository root.

## How it works

```
[COLLECT] → [DEDUP + MERGE] → [PREFILTER] → [GEMMA RERANK] → [TOP N] → [READWISE]
                                                 ▲
                                        [TASTE PROFILE]  ← built by Gemma from ~30 days
                                                            of your podcasts + authors
```

1. **Collect** — RSS (authors, labs, papers, podcasts), the Hacker News front page
   (AI-filtered), GitHub trending, and *cited links* mined from annotated podcast show
   notes (e.g. Latent Space). See `src/config.ts`.
2. **Dedup + merge** — canonicalizes URLs and merges duplicates; an item surfaced by
   several sources gets a corroboration boost. Also drops anything already in your
   Reader library.
3. **Taste profile** — Gemma reads ~30 days of your podcasts + author feeds (and, if
   enabled, locally-transcribed podcast topics + what you've read in Readwise) and infers
   the topics, keywords, authors, and domains you care about (`state/taste-profile.json`).
   Rebuilt automatically when it's >7 days old, or on demand with `--refresh-profile`.
4. **Prefilter → rerank** — a transparent heuristic narrows the pool, then Gemma reranks
   the survivors against your profile and writes a one-line "why you'll care" for each.
5. **Deliver** — saves the top N to Readwise Reader, tagged and annotated.
   `state/seen.json` guarantees nothing is ever sent twice (across both daily runs).

If Ollama isn't running, every step falls back gracefully to a transparent heuristic
ranker + a seed profile, so the agent still produces a digest (lower nuance).

## Sources

Followed authors: **Karpathy**, **Ethan Mollick** (One Useful Thing), **Citrini Research**,
**Simon Willison**, **Interconnects** (Nathan Lambert), **Import AI** (Jack Clark),
**Ahead of AI** (Sebastian Raschka), **Don't Worry About the Vase** (Zvi).
Labs: **OpenAI**, **Google DeepMind**, **Anthropic** (community mirror — no official
feed), **Hugging Face**. Papers: **arXiv** (cs.AI/LG/CL).
Aggregators: **Hacker News**, **GitHub trending**. Podcasts (taste signal + cited-link
mining where useful): **Latent Space**, **Last Week in AI**, **The AI Daily Brief**,
**Everyday AI**, **The Artificial Intelligence Show**.

No single source can flood a run — each is capped at 5 items per digest, so you get a
mix of articles, essays, papers, repos, and podcast picks. Add or reweight any source
in `src/config.ts`.

### Engagement feedback loop
Each run pulls your existing Reader library to (1) skip anything you've already saved and
(2) learn from what you've **archived or read** — those titles feed the next profile
rebuild. Disable with `READWISE_FEEDBACK=0`.

### Podcast transcription (optional, off by default)
Some podcasts (AI Daily Brief, Everyday AI) only put sponsor links in their show notes —
the articles they actually discuss are spoken. Set `TRANSCRIBE=1` and the agent uses
**Whisper on your Mac** to transcribe recent episodes, then Gemma extracts the *topics
discussed* to sharpen your taste profile. (It enriches ranking rather than producing
article links directly — that needed a web-search tool the local model doesn't have.)
Transcribed episodes are remembered (`state/transcribed.json`) so it never re-transcribes.
Requires `ffmpeg` + a Whisper CLI — see Setup.

### X/Twitter (optional, off by default)
Reading tweets (e.g. Matt Shumer, Jack Dorsey) needs a self-hosted **RSSHub** instance.
Set `X_RSSHUB_BASE` to pull posts from `X_HANDLES`; blank = no-op. Karpathy's and
Mollick's essays already arrive via their RSS feeds regardless.

## Setup (on the Mac Mini)

```bash
# 1. Install + start Ollama, pull the model
brew install ollama          # or download from ollama.com
ollama serve &               # runs the local LLM server (also a login item / brew service)
ollama pull gemma3:12b

# 2. Install deps and configure
cd ai-digest
npm install
cp .env.example .env          # fill in READWISE_TOKEN (from readwise.io/access_token)

# (optional) for podcast transcription:
brew install ffmpeg
pip install mlx-whisper        # Apple-Silicon Whisper; then set TRANSCRIBE=1 in .env
```

The only required value in `.env` is `READWISE_TOKEN`. Everything else has sensible
defaults (`OLLAMA_MODEL=gemma3:12b`, `DIGEST_LIMIT=20`, etc.).

## Usage

```bash
npm run bootstrap     # build the taste profile (auto-runs on first digest too)
npm run dry-run       # collect + rank + print top N, save nothing
npm run digest        # the real thing: rank + save top N to Readwise
npm run collect       # diagnostic: print collected candidates
```

## Scheduling (twice daily, via launchd)

```bash
bash deploy/install-launchd.sh            # runs daily at 07:00 and 17:00 local time
# custom times:  MORNING=8 EVENING=18 bash deploy/install-launchd.sh
```

This installs a `launchd` agent (`~/Library/LaunchAgents/com.ai-digest.digest.plist`)
that runs `deploy/run.sh` twice a day and logs to `state/digest.log`. To stop it:
`launchctl unload ~/Library/LaunchAgents/com.ai-digest.digest.plist`.

> The Mac must be awake at those times (or use `pmset`/Wake schedule). launchd uses
> **local** time. State lives in `state/*.json` on this machine.

### Optional cloud fallback
`.github/workflows/ai-digest.yml` can run the digest manually from GitHub Actions, but
the cloud can't reach your local Gemma, so it ranks with the heuristic only. Don't run it
on a schedule alongside the local agent — their dedup state is separate, so you'd get
duplicates.

## Cost

- Ranking + taste profile: **$0** — runs locally on Gemma.
- Transcription: **$0** — local Whisper (just CPU/GPU time on the Mac).
- Everything else (RSS, HN, GitHub, Readwise): free APIs.

## Roadmap

Done:
- ✅ Local Gemma (Ollama) ranking + taste profile — no cloud LLM.
- ✅ Local Whisper transcription → topic enrichment.
- ✅ More sources (Willison, Interconnects, Import AI, Raschka, Zvi, DeepMind, HF, LWiAI).
- ✅ Engagement feedback loop from your Reader library.
- ✅ GitHub trending, Anthropic (mirror), pluggable X/RSSHub.
- ✅ Per-source diversity cap; twice-daily launchd scheduling.

Future:
- **Resolve spoken citations to URLs** locally (add a local search tool like SearXNG so
  transcripts can yield saved articles, not just topics).
- **Star-velocity trending** for GitHub (the Search API has no true trending signal).
