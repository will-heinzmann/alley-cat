import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://alleycat-bowling.com";

const corsHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/alleys", priority: "0.9", changefreq: "daily" },
    { path: "/leaderboard", priority: "0.7", changefreq: "daily" },
    { path: "/blog", priority: "0.8", changefreq: "weekly" },
    { path: "/auth", priority: "0.3", changefreq: "monthly" },
    { path: "/log", priority: "0.5", changefreq: "daily" },
    { path: "/leagues", priority: "0.7", changefreq: "weekly" },
  ];

  const blogSlugs = [
    "how-to-calculate-bowling-handicap",
    "alley-cat-bowling",
    "bowling-stat-tracker",
    "bowling-scorecard-app",
    "bowling-alleys-near-me",
    "bowling-score-tracker",
    "bowling-scoreboard-online",
  ];

  // Fetch all alley slugs + city/state for city pages
  let allSlugs: { slug: string; updated_at: string; city: string; state: string }[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data } = await supabase
      .from("alleys")
      .select("slug, updated_at, city, state")
      .order("name")
      .range(from, from + batchSize - 1);
    if (!data || data.length === 0) break;
    allSlugs = allSlugs.concat(data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  const today = new Date().toISOString().split("T")[0];

  const citySlugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const citySlugSet = new Set<string>();
  for (const a of allSlugs) {
    if (a.city && a.state) {
      citySlugSet.add(`${citySlugify(a.city)}-${a.state.toLowerCase()}`);
    }
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const page of staticPages) {
    xml += `  <url>
    <loc>${SITE}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  for (const blogSlug of blogSlugs) {
    xml += `  <url>
    <loc>${SITE}/blog/${blogSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  for (const citySlug of citySlugSet) {
    xml += `  <url>
    <loc>${SITE}/city/${citySlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
`;
  }

  for (const alley of allSlugs) {
    const lastmod = alley.updated_at ? alley.updated_at.split("T")[0] : today;
    xml += `  <url>
    <loc>${SITE}/alley/${alley.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return new Response(xml, { status: 200, headers: corsHeaders });
});
