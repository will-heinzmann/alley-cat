import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const prerenderBase = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/prerender`;

  // Static pages with their prerender paths
  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/alleys", priority: "0.9", changefreq: "daily" },
    { path: "/leaderboard", priority: "0.7", changefreq: "daily" },
    { path: "/blog", priority: "0.8", changefreq: "weekly" },
  ];

  // Blog posts
  const blogSlugs = [
    "how-to-calculate-bowling-handicap",
    "alley-cat-bowling",
    "bowling-stat-tracker",
    "bowling-scorecard-app",
    "bowling-alleys-near-me",
    "bowling-score-tracker",
    "bowling-scoreboard-online",
  ];

  // Fetch all alley slugs
  let allSlugs: { slug: string; updated_at: string }[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data } = await supabase
      .from("alleys")
      .select("slug, updated_at")
      .order("name")
      .range(from, from + batchSize - 1);
    if (!data || data.length === 0) break;
    allSlugs = allSlugs.concat(data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Static pages → prerender URLs
  for (const page of staticPages) {
    const loc = `${prerenderBase}?path=${encodeURIComponent(page.path)}`;
    xml += `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Blog posts → prerender URLs
  for (const blogSlug of blogSlugs) {
    const loc = `${prerenderBase}?path=${encodeURIComponent(`/blog/${blogSlug}`)}`;
    xml += `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  // Alley pages → prerender URLs
  for (const alley of allSlugs) {
    const lastmod = alley.updated_at ? alley.updated_at.split("T")[0] : today;
    const loc = `${prerenderBase}?path=${encodeURIComponent(`/alley/${alley.slug}`)}`;
    xml += `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return new Response(xml, { status: 200, headers: corsHeaders });
});
