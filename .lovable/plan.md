

## Problem

The screenshot confirms it: **View Page Source** on `alleycat-bowling.com/alley/1-7-10-sports-center-augusta` shows the generic SPA shell — just `<div id="root"></div>` with home page meta tags. No alley name, no address, no description.

**Root cause**: Lovable's hosting has a built-in SPA fallback. It serves the root `index.html` for every route, ignoring the static HTML files the Vite prerender plugin generates in `dist/alley/<slug>/index.html`. The prerendered files exist in the build output but never reach the browser or bots.

This cannot be fixed at the hosting layer — Lovable hosting always serves the SPA shell for deep links. The Vite prerender plugin approach is a dead end.

## Solution: Route Bots Through Edge Functions

The `prerender` and `seo-proxy` Edge Functions already exist and work. The missing piece is connecting bots to them. Since we can't change hosting behavior, we route bots via the **sitemap** and **robots.txt**.

### Steps

1. **Update `prerender/index.ts`** — Change the `SITE` constant from `alley-cat.lovable.app` to `alleycat-bowling.com` so canonical URLs point to the custom domain.

2. **Update `seo-proxy/index.ts`** — Change the `SITE` constant to `alleycat-bowling.com`. Remove the bot-detection gate — serve prerendered HTML to ALL visitors (only bots follow sitemap URLs to this endpoint anyway). This ensures Ubersuggest, Google, etc. always get full HTML.

3. **Update `sitemap/index.ts`** — Point all `<loc>` URLs to the seo-proxy Edge Function (e.g., `https://iwtaccnyzfxxlohskkal.supabase.co/functions/v1/seo-proxy?path=/alley/slug`). The prerendered HTML inside contains `<link rel="canonical" href="https://alleycat-bowling.com/alley/slug">`, so Google indexes under the clean custom domain URL.

4. **Update `public/robots.txt`** — Point sitemap to the dynamic Edge Function sitemap: `Sitemap: https://iwtaccnyzfxxlohskkal.supabase.co/functions/v1/sitemap`

5. **Remove `vite-plugin-prerender.ts` and `scripts/prerender-static.mjs`** — These generate static files that Lovable hosting ignores. Remove the plugin from `vite.config.ts` and the script from `package.json`. Eliminates build complexity and a ~2,000-file generation step that does nothing.

### How It Works

```text
Bot visits sitemap
  → Sees: .../seo-proxy?path=/alley/slug
  → Fetches that URL
  → Gets full HTML with alley name, address, About section, JSON-LD
  → Sees <link rel="canonical" href="https://alleycat-bowling.com/alley/slug">
  → Indexes content under the clean canonical URL

Human visits alleycat-bowling.com/alley/slug
  → Gets SPA shell (unchanged)
  → React app loads and renders normally
```

### Technical Details

- The `prerender` Edge Function already handles all routes: home, alleys, blog, leaderboard, and 2,000+ individual alley pages
- Each prerendered page includes JSON-LD structured data, meta tags, full text content, and related alleys
- Canonical tags ensure Google attributes content to `alleycat-bowling.com` URLs
- No hosting configuration changes needed — everything works through Edge Functions

