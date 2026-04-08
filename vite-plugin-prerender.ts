import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Plugin } from "vite";

const SITE = "https://alley-cat.lovable.app";

const blogPosts = [
  { slug: "how-to-calculate-bowling-handicap", title: "How to Calculate Bowling Handicap — Easy Guide (2026)", description: "Learn how to calculate your bowling handicap step-by-step.", intro: "Understanding your bowling handicap is essential for fair league competition." },
  { slug: "alley-cat-bowling", title: "Alley Cat Bowling — The Social Bowling App for Every Bowler", description: "Alley Cat is a free bowling app to track scores, find alleys, and compete on leaderboards.", intro: "Alley Cat is more than a score tracker — it's a social platform for bowlers." },
  { slug: "bowling-stat-tracker", title: "Best Bowling Stat Tracker — Track Scores, Averages & Trends", description: "Find the best bowling stat tracker to log games and analyze trends.", intro: "Serious bowlers know that improvement starts with data." },
  { slug: "bowling-scorecard-app", title: "Free Bowling Scorecard App — Log Games Frame by Frame", description: "Use a free bowling scorecard app to log games frame-by-frame.", intro: "Forget pen and paper. A digital scorecard app makes it easy to log every roll." },
  { slug: "bowling-alleys-near-me", title: "Find Bowling Alleys Near Me — 2,000+ Locations with Ratings", description: "Search 2,000+ bowling alleys near you with ratings and reviews.", intro: "Alley Cat has a directory of bowling alleys across the United States." },
  { slug: "bowling-score-tracker", title: "Bowling Score Tracker — Free Online Tool to Log Every Game", description: "Track your bowling scores online for free with Alley Cat.", intro: "A bowling score tracker helps you stay on top of your game." },
  { slug: "bowling-scoreboard-online", title: "Free Online Bowling Scoreboard — Score Games Live", description: "Use a free online bowling scoreboard to score games live with friends.", intro: "Alley Cat gives you a clean, easy-to-use digital scoreboard." },
];

const escapeHtml = (value = "") =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const fmt = (value: any, fallback = "") => escapeHtml(value ?? fallback);

const ratingText = (v: any) => { const n = Number(v || 0); return n > 0 ? `${n}/5` : "No Reviews"; };

function buildDoc({ title, description, canonicalPath, bodyHtml, jsonLd, assetTags }: any) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${SITE}${canonicalPath}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Alley Cat" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${SITE}${canonicalPath}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>` : ""}
    ${assetTags}
  </head>
  <body>
    <div id="root">${bodyHtml}</div>
  </body>
</html>`;
}

function staticPage({ title, description, canonicalPath, heading, intro, sections = [], links = [], assetTags }: any) {
  const body = `
    <div class="min-h-screen pb-20">
      <header class="border-b border-border p-4 text-center">
        <h1 class="text-xl text-primary">${fmt(heading)}</h1>
        <p class="text-xs text-muted-foreground mt-1">${fmt(intro)}</p>
      </header>
      <div class="max-w-4xl mx-auto p-4 space-y-4">
        ${sections.map((s: any) => `<section class="border border-border bg-card p-4 space-y-2"><h2 class="text-sm text-primary">${fmt(s.heading)}</h2><p class="text-sm text-foreground leading-relaxed">${fmt(s.content)}</p></section>`).join("")}
        ${links.length ? `<div class="border border-border bg-card p-4"><ul class="space-y-2">${links.map((l: any) => `<li><a class="text-primary hover:underline" href="${l.href}">${fmt(l.label)}</a></li>`).join("")}</ul></div>` : ""}
      </div>
    </div>`;
  return buildDoc({ title, description, canonicalPath, bodyHtml: body, assetTags });
}

function alleyPage(alley: any, related: any[], assetTags: string) {
  const canonicalPath = `/alley/${alley.slug}`;
  const title = `${alley.name} in ${alley.city}, ${alley.state} | Lanes & Leaderboard | Alley Cat`;
  const description = `Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}. Track your bowling stats and join the ${alley.city} leaderboard on Alley Cat.`;
  const addr = [alley.address, alley.city, alley.state, alley.zip_code].filter(Boolean).join(", ");
  const lanes = alley.lane_count > 0 ? String(alley.lane_count) : "Unknown";
  const phone = alley.phone ? `<span>${fmt(alley.phone)}</span>` : `<span class="text-muted-foreground italic">Not listed</span>`;
  const webRow = alley.website ? `<tr><td class="border border-border p-2 text-muted-foreground bg-muted">Website</td><td class="border border-border p-2"><a href="${escapeHtml(alley.website)}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${fmt(alley.website)}</a></td></tr>` : "";

  const otherHtml = related.length ? `<section class="border border-border bg-card p-4"><h2 class="text-sm text-primary font-bold mb-3">Other Alleys in ${fmt(alley.state)}</h2><ul class="space-y-2 text-sm text-foreground">${related.map((r: any) => `<li><a class="text-primary hover:underline" href="/alley/${r.slug}">🎳 ${fmt(r.name)} — ${fmt(r.city)}, ${fmt(r.state)}</a></li>`).join("")}</ul></section>` : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BowlingAlley",
    name: alley.name,
    address: { "@type": "PostalAddress", streetAddress: alley.address, addressLocality: alley.city, addressRegion: alley.state, ...(alley.zip_code ? { postalCode: alley.zip_code } : {}) },
    ...(alley.phone ? { telephone: alley.phone } : {}),
    ...(alley.website ? { url: alley.website } : {}),
  };

  const body = `
    <div class="min-h-screen pb-20">
      <header class="border-b border-border p-4">
        <a href="/alleys" class="text-primary text-xs">← Back to Directory</a>
        <div class="flex items-center justify-between mt-1">
          <h1 class="text-lg text-primary">🎳 ${fmt(alley.name).toUpperCase()}</h1>
        </div>
        <hr class="border-primary mt-2" />
      </header>
      <div class="p-4 space-y-4">
        <table class="w-full border-collapse border border-border text-sm">
          <tbody>
            <tr class="bg-muted"><td class="border border-border p-2 text-muted-foreground w-24">Address</td><td class="border border-border p-2 text-foreground">${fmt(addr)}</td></tr>
            <tr><td class="border border-border p-2 text-muted-foreground bg-muted">Phone</td><td class="border border-border p-2 text-foreground">${phone}</td></tr>
            ${webRow}
            <tr><td class="border border-border p-2 text-muted-foreground bg-muted">Lanes</td><td class="border border-border p-2"><span class="text-primary font-bold">${fmt(lanes)}</span></td></tr>
            <tr><td class="border border-border p-2 text-muted-foreground bg-muted">Oil</td><td class="border border-border p-2 text-foreground">${fmt(alley.oil_pattern || "House")}</td></tr>
            <tr><td class="border border-border p-2 text-muted-foreground bg-muted">Alley Rating</td><td class="border border-border p-2 text-primary">${fmt(ratingText(alley.alley_rating))}</td></tr>
            <tr><td class="border border-border p-2 text-muted-foreground bg-muted">Beer Rating</td><td class="border border-border p-2 text-secondary">${fmt(ratingText(alley.beer_rating))}</td></tr>
          </tbody>
        </table>
        <section class="border border-border bg-card p-4 space-y-3">
          <h2 class="text-sm text-primary font-bold">About ${fmt(alley.name)}</h2>
          <p class="text-sm text-foreground leading-relaxed">${fmt(alley.name)} is a bowling destination in ${fmt(alley.city)}, ${fmt(alley.state)} where bowlers can settle in for open play, league sessions, and focused practice. With ${fmt(lanes)} lanes, it gives local players a reliable spot to chase cleaner frames and bigger scores.</p>
          <p class="text-sm text-muted-foreground leading-relaxed">Planning a visit to ${fmt(alley.name)}? Use Alley Cat to log every frame, track spare conversions, monitor your average, and compare your scores with other bowlers on the ${fmt(alley.city)} leaderboard.</p>
        </section>
        ${otherHtml}
      </div>
    </div>`;

  return buildDoc({ title, description, canonicalPath, bodyHtml: body, jsonLd, assetTags });
}

function buildSitemap(alleys: any[]) {
  const today = new Date().toISOString().split("T")[0];
  const statics = [
    { path: "/", priority: "1.0", freq: "daily" },
    { path: "/alleys", priority: "0.9", freq: "daily" },
    { path: "/leaderboard", priority: "0.7", freq: "weekly" },
    { path: "/blog", priority: "0.8", freq: "weekly" },
  ];
  const urls = [
    ...statics.map(p => ({ loc: `${SITE}${p.path}`, lastmod: today, changefreq: p.freq, priority: p.priority })),
    ...blogPosts.map(p => ({ loc: `${SITE}/blog/${p.slug}`, lastmod: today, changefreq: "monthly", priority: "0.7" })),
    ...alleys.map(a => ({ loc: `${SITE}/alley/${a.slug}`, lastmod: a.updated_at?.split("T")[0] || today, changefreq: "weekly", priority: "0.8" })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n")}\n</urlset>`;
}

const writeFile = async (fp: string, content: string) => {
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, content, "utf8");
};

export default function prerenderPlugin(): Plugin {
  let supabaseUrl = "";
  let supabaseKey = "";

  return {
    name: "vite-plugin-prerender-alleys",
    apply: "build",
    configResolved(config) {
      supabaseUrl = config.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      supabaseKey = config.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
    },
    async closeBundle() {
      if (!supabaseUrl || !supabaseKey) {
        console.warn("[prerender] Skipping — missing Supabase env vars");
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const distDir = path.resolve("dist");
      const baseHtml = await fs.readFile(path.join(distDir, "index.html"), "utf8");
      const assetTags = Array.from(baseHtml.matchAll(/<(?:link|script)\b[^>]*(?:><\/script>|\/?>)/g))
        .map(m => m[0]).join("\n    ");

      // Fetch all alleys
      const allAlleys: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("alleys")
          .select("id, slug, name, address, city, state, zip_code, phone, website, lane_count, oil_pattern, alley_rating, beer_rating, updated_at")
          .order("name").range(from, from + 999);
        if (error) { console.error("[prerender]", error); return; }
        if (!data?.length) break;
        allAlleys.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }

      const byState = new Map<string, any[]>();
      for (const a of allAlleys) {
        const list = byState.get(a.state) || [];
        list.push(a);
        byState.set(a.state, list);
      }

      // Home
      const homeBody = `
    <div class="min-h-screen pb-20">
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <div class="border-b border-primary pb-2 mb-4"><h1 class="text-lg text-primary font-bold">🏠 HOME FEED</h1></div>
        <div class="max-w-4xl mx-auto px-4 py-6 mt-4 bg-muted/40 border-t border-border">
          <h2 class="text-sm text-primary border-b border-border pb-1 mb-3">🎳 About Alley Cat</h2>
          <div class="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>Alley Cat is the free bowling companion built for everyone — from casual weekend rollers to die-hard league bowlers chasing better numbers.</p>
            <p>Track scores frame by frame, analyze trends, discover bowling alleys across the country, and compete on leaderboards.</p>
          </div>
        </div>
      </div>
    </div>`;
      await writeFile(path.join(distDir, "index.html"), buildDoc({
        title: "Alley Cat — Track Bowling Scores, Find Alleys & Compete",
        description: "Alley Cat is the ultimate bowling companion. Track scores frame-by-frame, discover bowling alleys, compare stats, and climb the leaderboard.",
        canonicalPath: "/", bodyHtml: homeBody, assetTags,
      }));

      // Static routes
      await writeFile(path.join(distDir, "alleys", "index.html"), staticPage({
        title: "Find Bowling Alleys Near You — 2,000+ Venues | Alley Cat",
        description: "Browse bowling alleys across the US. Filter by state, city, and rating.",
        canonicalPath: "/alleys", heading: "🎳 ALLEY CAT 🎳", intro: "Find Your Lane",
        sections: [
          { heading: "Search Bowling Alleys", content: "Browse alley pages with address details, lane count, oil pattern notes, and community ratings." },
          { heading: "Track More Than Directions", content: "Each alley page helps bowlers log scores, compare performance, and discover other venues nearby." },
        ], assetTags,
      }));

      await writeFile(path.join(distDir, "leaderboard", "index.html"), staticPage({
        title: "Bowling Leaderboard — Top Bowlers Ranked | Alley Cat",
        description: "See the top-ranked bowlers on Alley Cat. Compare scores and averages on the global leaderboard.",
        canonicalPath: "/leaderboard", heading: "🏆 Global Top Cats", intro: "See how bowlers stack up.",
        sections: [
          { heading: "Track Rankings", content: "Compare averages, high scores, and total points across all bowlers." },
          { heading: "Compete With Context", content: "Log games consistently and track how your performance evolves." },
        ], assetTags,
      }));

      await writeFile(path.join(distDir, "blog", "index.html"), staticPage({
        title: "Bowling Tips & Guides — Alley Cat Blog",
        description: "Bowling tips, guides, and resources from Alley Cat.",
        canonicalPath: "/blog", heading: "🎳 Alley Cat Blog", intro: "Bowling tips, guides, and resources",
        links: blogPosts.map(p => ({ href: `/blog/${p.slug}`, label: p.title })), assetTags,
      }));

      for (const post of blogPosts) {
        await writeFile(path.join(distDir, "blog", post.slug, "index.html"), staticPage({
          title: post.title, description: post.description,
          canonicalPath: `/blog/${post.slug}`, heading: post.title, intro: post.intro,
          sections: [
            { heading: "Why It Matters", content: post.description },
            { heading: "How Alley Cat Helps", content: `${post.intro} Use Alley Cat to track games and discover new alleys.` },
          ], assetTags,
        }));
      }

      // Alley pages
      for (const alley of allAlleys) {
        const related = (byState.get(alley.state) || [])
          .filter((c: any) => c.id !== alley.id && !/test alley/i.test(c.name || ""))
          .slice(0, 5);
        await writeFile(path.join(distDir, "alley", alley.slug, "index.html"), alleyPage(alley, related, assetTags));
      }

      // Sitemap
      await writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(allAlleys));

      console.log(`[prerender] Generated ${allAlleys.length} alley pages + static routes + sitemap.xml`);
    },
  };
}
