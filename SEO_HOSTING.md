# SEO Hosting Setup — Dynamic Rendering for Crawlers

## Why this exists

Lovable's built-in hosting serves a single static `index.html` for every
route (SPA fallback). It cannot:

- Serve different HTML per URL
- Detect bot user-agents and route them differently
- Run server middleware

That means crawlers like Ubersuggest see only the empty React shell and
report "no content found" + duplicate meta descriptions. Googlebot
eventually renders JS and sees the real content, but the lag hurts
rankings and many SEO audit tools never run JS at all.

## The solution: dynamic rendering on a host that supports middleware

The Supabase `seo-proxy` edge function already returns rich, unique HTML
for every alley, blog post, and core route. We just need a host that can
detect bot traffic and proxy it to that function while letting humans
flow through to the SPA.

This repo is preconfigured for **Cloudflare Pages**, **Vercel**, and
**Netlify**. Pick one, connect the GitHub repo, and deploy. URLs stay
clean. No code changes needed.

---

## Option 1: Cloudflare Pages (recommended — generous free tier)

1. Push this repo to GitHub via Lovable's GitHub integration
   (Connectors → GitHub → Connect project).
2. In Cloudflare dashboard: **Workers & Pages → Create → Pages →
   Connect to Git** and pick the repo.
3. Build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy. The `functions/_middleware.ts` file is auto-detected and
   runs on every request at the edge.
5. Point your custom domain (`alleycat-bowling.com`) at Cloudflare
   instead of Lovable.

Verify with:
```
curl -A "Googlebot/2.1" https://alleycat-bowling.com/alley/<slug> | head -20
curl -A "Mozilla/5.0" https://alleycat-bowling.com/alley/<slug> | head -20
```
The Googlebot request should return rich `<title>`, `<meta description>`,
and `<h1>` content. The browser request should return the SPA shell.

---

## Option 2: Vercel

1. Push repo to GitHub.
2. Import the project at vercel.com.
3. Framework preset: **Vite**. Defaults are fine.
4. Deploy. `middleware.ts` runs on the matched routes.
5. Move DNS to Vercel.

Note: `middleware.ts` uses `next/server` types, which Vercel provides at
runtime even for non-Next projects. If you'd rather not pull in
`next`, swap to a Vercel Edge Function under `api/` — the proxy logic is
the same.

---

## Option 3: Netlify

1. Push repo to GitHub.
2. Import the site at netlify.com.
3. `netlify.toml` configures everything (build, SPA fallback, edge
   function). No manual setup.
4. Deploy. The edge function `netlify/edge-functions/seo-rewrite.ts`
   handles bot detection.
5. Move DNS to Netlify.

---

## How it works (all three hosts)

```
            ┌──────────────┐
 Request ──▶│  Edge        │
            │  Middleware  │
            └──────┬───────┘
                   │
        bot UA?    │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
 ┌────────────┐         ┌──────────────┐
 │ seo-proxy  │         │ index.html   │
 │ (Supabase) │         │ (SPA shell)  │
 └────────────┘         └──────────────┘
   rich HTML              React app
   for crawlers           for humans
```

The bot regex covers Googlebot, Bingbot, Ubersuggest, Ahrefs, Semrush,
Slack/Discord/Twitter unfurlers, and ~20 others. Add or remove patterns
in the `BOT_REGEX` constant in each middleware file.

Prerenderable routes:
- `/`
- `/alleys`
- `/leaderboard`
- `/blog`
- `/blog/:slug`
- `/alley/:slug`

To add a new route, update `PRERENDERABLE_PATH` in all three middleware
files **and** add a handler in `supabase/functions/prerender/index.ts`.

---

## Testing locally

You can hit the proxy directly to confirm it returns the right HTML:

```
curl "https://iwtaccnyzfxxlohskkal.supabase.co/functions/v1/seo-proxy?path=/alley/10pin-bowling-lounge-chicago"
```

You should see a full HTML document with the alley name in the title,
a unique meta description, body copy, and BowlingAlley JSON-LD.
