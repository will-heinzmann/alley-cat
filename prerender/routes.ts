const BATCH_SIZE = 1000;

interface BuildEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  PRERENDER_ROUTE_LIMIT?: string;
}

interface AlleySlugRow {
  slug: string;
}

async function fetchAlleySlugs(supabaseUrl: string, anonKey: string, limit?: number) {
  const routes: string[] = [];
  let offset = 0;

  while (true) {
    const remaining = typeof limit === "number" ? Math.max(limit - routes.length, 0) : BATCH_SIZE;
    if (typeof limit === "number" && remaining === 0) break;

    const batchSize = Math.min(BATCH_SIZE, remaining || BATCH_SIZE);
    const url = new URL(`${supabaseUrl}/rest/v1/alleys`);
    url.searchParams.set("select", "slug");
    url.searchParams.set("order", "name.asc");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(batchSize));

    const response = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch alley slugs: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AlleySlugRow[];
    if (!data.length) break;

    routes.push(...data.map(({ slug }) => `/alley/${slug}`));

    if (data.length < batchSize) break;
    offset += batchSize;
  }

  return routes;
}

export async function getPrerenderRoutes(env: BuildEnv) {
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY;
  const limitEnv = env.PRERENDER_ROUTE_LIMIT ? Number(env.PRERENDER_ROUTE_LIMIT) : 0;
  const limit = Number.isFinite(limitEnv) ? limitEnv : 0;

  // Build-time prerendering of every alley exceeds the build timeout.
  // The seo-proxy edge function serves prerendered HTML on-demand to bots,
  // so only prerender alley routes when explicitly opted in via PRERENDER_ROUTE_LIMIT.
  if (!supabaseUrl || !anonKey || limit <= 0) {
    if (!supabaseUrl || !anonKey) {
      console.warn("[prerender] Missing backend env vars; skipping alley prerendering.");
    } else {
      console.log("[prerender] Skipping alley prerendering (set PRERENDER_ROUTE_LIMIT to enable).");
    }
    return [];
  }

  const alleyRoutes = await fetchAlleySlugs(supabaseUrl, anonKey, limit);
  console.log(`[prerender] Preparing ${alleyRoutes.length} alley routes.`);
  return alleyRoutes;
}
