

## Problem

Ubersuggest (and most SEO crawlers besides Google) do **not execute JavaScript**. Your app is a client-side SPA — the `index.html` body is just `<div id="root"></div>`. When these crawlers visit any page, they see zero words because all content is rendered by JavaScript after page load. `react-helmet-async` only works in the browser, not for non-JS crawlers.

The prerender Edge Function we built earlier (`supabase/functions/prerender`) solves this for alley pages, but **nothing routes crawlers to it** — they still hit the empty SPA shell.

## Solution: Prerender Middleware via Edge Function

Create a **gateway Edge Function** that acts as a lightweight reverse proxy:

1. **Detect bots** — Check the `User-Agent` header for known crawlers (Googlebot, Bingbot, Ubersuggest, Twitterbot, facebookexternalhit, etc.)
2. **For bots** — Generate and return fully-rendered static HTML with all the text content, meta tags, and structured data already in the markup
3. **For real users** — Redirect or proxy to the normal SPA

### What gets prerendered

| Route pattern | Content source |
|---|---|
| `/alley/:slug` | Existing prerender function (alley data from DB) |
| `/blog/:slug` | Blog post content from `blogPosts` data |
| `/blog` | Blog index listing |
| `/` (home) | Static SEO copy about Alley Cat |
| `/alleys` | Alley directory description + state links |
| `/leaderboard` | Leaderboard description |

### Implementation steps

1. **Create `supabase/functions/seo-proxy/index.ts`** — A single Edge Function that:
   - Parses the incoming URL path
   - Checks User-Agent for bot signatures
   - For bots: returns full HTML with real text content, meta tags, and JSON-LD
   - For humans: returns a redirect to the SPA URL

2. **Update `robots.txt`** — No changes needed; bots already have `Allow: /`

3. **Update `public/sitemap.xml` generation** — Point alley URLs to the proxy endpoint so crawlers hit the prerendered version

### The catch

This approach works perfectly **if you can point your domain's traffic through the Edge Function**. Since Lovable hosting doesn't support custom reverse proxy configuration, the practical approach is:

- **Option A**: Update the sitemap to use the Edge Function URLs directly (e.g., `https://iwtaccnyzfxxlohskkal.supabase.co/functions/v1/prerender?slug=...`). Crawlers follow sitemap URLs and will get full HTML. The downside is the URLs in search results would show the function URL unless you add canonical tags pointing back to the SPA.

- **Option B** (recommended): Enhance the existing `prerender` Edge Function to handle **all page types** (not just alleys), then update the sitemap to list the prerender URLs with `<link rel="canonical">` tags pointing to the real SPA URLs. This way crawlers index the content but Google shows the clean URLs in search results.

### Technical details

- The prerender function already returns proper HTML with meta tags and caching headers
- Extend it to accept a `path` parameter (e.g., `?path=/blog/bowling-handicap`) in addition to `?slug=`
- Each page type gets a template with real text content baked in
- Canonical URLs always point to `https://alley-cat.lovable.app/...`
- The sitemap Edge Function updates to emit the prerender endpoint URLs

