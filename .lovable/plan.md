

## Problem

The current `public/sitemap.xml` is a static file — a frozen snapshot from when it was generated. When new alleys are added to the database, they don't appear in the sitemap until someone manually regenerates it. The Edge Function at `supabase/functions/sitemap/index.ts` already generates a dynamic sitemap with all alleys, but Google can't use it because `robots.txt` points to the static file.

## Solution

Remove the static file and point Google directly to the Edge Function, which already queries all alleys dynamically.

### Steps

1. **Delete `public/sitemap.xml`** — Remove the 12,000+ line static file. It goes stale immediately and is the root cause of missing alleys.

2. **Update `public/robots.txt`** — Change the Sitemap directive from the static file to the Edge Function URL:
   ```
   Sitemap: https://iwtaccnyzfxxlohskkal.supabase.co/functions/v1/sitemap
   ```

3. **Add a client-side redirect** — Since Google previously indexed `alleycat-bowling.com/sitemap.xml`, add a small catch in routing or a meta-refresh so any bot hitting `/sitemap.xml` gets redirected to the Edge Function. This can be done via a Vite plugin or a simple `_redirects`-style config depending on the hosting setup. Alternatively, we can skip this if the robots.txt update is sufficient.

The Edge Function (`supabase/functions/sitemap/index.ts`) already handles everything correctly: it paginates through all alleys in batches of 1,000, includes `updated_at` dates, blog posts, and static pages. No changes needed there.

### Technical Details

- The Edge Function returns `Content-Type: application/xml` with proper caching headers (1 hour)
- It fetches alleys in batches to handle the 1,000-row Supabase limit
- Each alley URL follows the `/alley/:slug` pattern with `updated_at` as `lastmod`
- After deploying, re-submit the new sitemap URL in Google Search Console

