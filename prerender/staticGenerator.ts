import { promises as fs } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { AlleyRow, buildAlleyHtml, buildCityHtml, CityGroup } from "./htmlTemplates";

const BATCH_SIZE = 1000;

interface BuildEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  STATIC_PRERENDER?: string;
}

async function fetchAllAlleys(supabaseUrl: string, anonKey: string): Promise<AlleyRow[]> {
  const all: AlleyRow[] = [];
  let offset = 0;
  while (true) {
    const url = new URL(`${supabaseUrl}/rest/v1/alleys`);
    url.searchParams.set(
      "select",
      "slug,name,city,state,address,zip_code,phone,website,lane_count,alley_rating,oil_pattern"
    );
    url.searchParams.set("order", "name.asc");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(BATCH_SIZE));

    const res = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!res.ok) {
      throw new Error(`[static-prerender] Failed to fetch alleys: ${res.status} ${res.statusText}`);
    }
    const batch = (await res.json()) as AlleyRow[];
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
  return all;
}

function citySlugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function groupByCity(alleys: AlleyRow[]): CityGroup[] {
  const map = new Map<string, CityGroup>();
  for (const a of alleys) {
    if (!a.city || !a.state) continue;
    const citySlug = `${citySlugify(a.city)}-${a.state.toLowerCase()}`;
    if (!map.has(citySlug)) {
      map.set(citySlug, { citySlug, city: a.city, state: a.state, alleys: [] });
    }
    map.get(citySlug)!.alleys.push({ name: a.name, slug: a.slug, rating: a.alley_rating });
  }
  for (const g of map.values()) {
    g.alleys.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  }
  return Array.from(map.values());
}

export function staticPrerenderPlugin(env: BuildEnv): Plugin {
  return {
    name: "alleycat-static-prerender",
    apply: "build",
    async closeBundle() {
      const enabled = (env.STATIC_PRERENDER ?? "1") !== "0";
      if (!enabled) {
        console.log("[static-prerender] Disabled via STATIC_PRERENDER=0");
        return;
      }
      const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
      const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) {
        console.warn("[static-prerender] Missing Supabase env vars; skipping.");
        return;
      }

      const distDir = path.resolve(process.cwd(), "dist");
      const shellPath = path.join(distDir, "index.html");
      let shell: string;
      try {
        shell = await fs.readFile(shellPath, "utf-8");
      } catch {
        console.warn("[static-prerender] dist/index.html not found; skipping.");
        return;
      }

      const t0 = Date.now();
      let alleys: AlleyRow[];
      try {
        alleys = await fetchAllAlleys(supabaseUrl, anonKey);
      } catch (err) {
        console.warn(`[static-prerender] Aborting: ${(err as Error).message}`);
        return;
      }
      console.log(`[static-prerender] Fetched ${alleys.length} alleys in ${Date.now() - t0}ms`);

      // Write per-alley static HTML
      const writes: Promise<void>[] = [];
      for (const alley of alleys) {
        if (!alley.slug) continue;
        const dir = path.join(distDir, "alley", alley.slug);
        const html = buildAlleyHtml(shell, alley);
        writes.push(
          fs.mkdir(dir, { recursive: true }).then(() => fs.writeFile(path.join(dir, "index.html"), html, "utf-8"))
        );
      }

      // Write per-city static HTML
      const cities = groupByCity(alleys);
      for (const group of cities) {
        const dir = path.join(distDir, "city", group.citySlug);
        const html = buildCityHtml(shell, group);
        writes.push(
          fs.mkdir(dir, { recursive: true }).then(() => fs.writeFile(path.join(dir, "index.html"), html, "utf-8"))
        );
      }

      await Promise.all(writes);
      console.log(
        `[static-prerender] Wrote ${alleys.length} alley pages + ${cities.length} city pages in ${Date.now() - t0}ms`
      );
    },
  };
}
