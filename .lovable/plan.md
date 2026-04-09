

## Update Canonical URLs to Custom Domain

### What's changing
Replace all occurrences of `https://alley-cat.lovable.app` with `https://alleycat-bowling.com` across the entire project. One page (`Leagues.tsx`) already uses the correct domain.

### Files to update

**Client-side pages (canonical + OG URLs):**
1. `src/pages/Feed.tsx` — canonical `/`
2. `src/pages/Index.tsx` — canonical `/alleys`
3. `src/pages/AlleyDetail.tsx` — canonical `/alley/{slug}`
4. `src/pages/ScoreLog.tsx` — canonical `/log`
5. `src/pages/Leaderboard.tsx` — canonical `/leaderboard`
6. `src/pages/AuthPage.tsx` — canonical `/auth`
7. `src/pages/LeagueNight.tsx` — canonical `/league`
8. `src/pages/BlogIndex.tsx` — canonical `/blog`
9. `src/pages/BlogPost.tsx` — canonical + OG URL + JSON-LD `url` and `mainEntityOfPage`

**Edge Function:**
10. `supabase/functions/prerender/index.ts` — the `SITE` constant at the top

**Share text (not canonical but still references the old domain):**
11. `src/pages/LeagueNight.tsx` — share text string
12. `src/components/SeriesSummary.tsx` — share text string

### How
- Simple find-and-replace: `https://alley-cat.lovable.app` → `https://alleycat-bowling.com` in all files listed above
- No logic changes, no new files

