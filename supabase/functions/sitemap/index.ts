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

  const baseUrl = "https://alley-cat.lovable.app";

  // Static pages
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/alleys", priority: "0.9", changefreq: "daily" },
    { loc: "/leaderboard", priority: "0.7", changefreq: "daily" },
    { loc: "/auth", priority: "0.3", changefreq: "monthly" },
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

  for (const page of staticPages) {
    xml += `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  for (const alley of allSlugs) {
    const lastmod = alley.updated_at ? alley.updated_at.split("T")[0] : today;
    xml += `  <url>
    <loc>${baseUrl}/alley/${alley.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return new Response(xml, { status: 200, headers: corsHeaders });
});
