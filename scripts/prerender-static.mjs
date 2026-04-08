import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://alley-cat.lovable.app";
const DIST_DIR = path.resolve("dist");
const ROOT_INDEX_PATH = path.join(DIST_DIR, "index.html");
const blogPosts = [
  {
    slug: "how-to-calculate-bowling-handicap",
    title: "How to Calculate Bowling Handicap — Easy Guide (2026)",
    description: "Learn how to calculate your bowling handicap step-by-step. Use the standard formula with basis score, average, and percentage factor.",
    intro: "Whether you're joining a league or just want to level the playing field with friends, understanding your bowling handicap is essential.",
  },
  {
    slug: "alley-cat-bowling",
    title: "Alley Cat Bowling — The Social Bowling App for Every Bowler",
    description: "Alley Cat is a free bowling app to track scores, find alleys, and compete on leaderboards. Built for casual and league bowlers alike.",
    intro: "Alley Cat is more than a score tracker — it's a social platform built for bowlers who want to track, compete, and discover the best alleys in America.",
  },
  {
    slug: "bowling-stat-tracker",
    title: "Best Bowling Stat Tracker — Track Scores, Averages & Trends",
    description: "Find the best bowling stat tracker to log games, monitor averages, and analyze performance trends. Free and easy to use.",
    intro: "Serious bowlers know that improvement starts with data. A good stat tracker helps you see patterns, set goals, and measure progress over time.",
  },
  {
    slug: "bowling-scorecard-app",
    title: "Free Bowling Scorecard App — Log Games Frame by Frame",
    description: "Use a free bowling scorecard app to log games frame-by-frame, track strikes and spares, and calculate scores automatically.",
    intro: "Forget pen and paper. A digital bowling scorecard app makes it easy to log every roll, track your stats, and share results with friends.",
  },
  {
    slug: "bowling-alleys-near-me",
    title: "Find Bowling Alleys Near Me — 2,000+ Locations with Ratings",
    description: "Search 2,000+ bowling alleys near you with ratings, reviews, and details like lane count and oil patterns. Find your next lane.",
    intro: "Looking for a bowling alley nearby? Alley Cat has a directory of bowling alleys across the United States — complete with ratings, reviews, and details you won't find on Google.",
  },
  {
    slug: "bowling-score-tracker",
    title: "Bowling Score Tracker — Free Online Tool to Log Every Game",
    description: "Track your bowling scores online for free. Log games, calculate averages, and monitor your improvement over time with Alley Cat.",
    intro: "A bowling score tracker helps you stay on top of your game. Log every session, watch your average climb, and never lose track of a personal best.",
  },
  {
    slug: "bowling-scoreboard-online",
    title: "Free Online Bowling Scoreboard — Score Games Live",
    description: "Use a free online bowling scoreboard to score games live with friends. Supports group play, pin-by-pin input, and shareable results.",
    intro: "Need an online bowling scoreboard? Alley Cat gives you a clean, easy-to-use digital scoreboard for live bowling sessions with friends.",
  },
];

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables for static prerendering.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatMaybe = (value, fallback = "") => escapeHtml(value ?? fallback);

const toRatingText = (value) => {
  const numeric = Number(value || 0);
  return numeric > 0 ? `${numeric}/5` : "No Reviews";
};

const buildDocument = ({ title, description, canonicalPath, bodyHtml, jsonLd, assetTags }) => `<!doctype html>
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

const buildSitemapXml = (alleys) => {
  const today = new Date().toISOString().split("T")[0];
  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/alleys", priority: "0.9", changefreq: "daily" },
    { path: "/leaderboard", priority: "0.7", changefreq: "weekly" },
    { path: "/blog", priority: "0.8", changefreq: "weekly" },
  ];

  const urls = [
    ...staticPages.map((page) => ({
      loc: `${SITE}${page.path}`,
      lastmod: today,
      changefreq: page.changefreq,
      priority: page.priority,
    })),
    ...blogPosts.map((post) => ({
      loc: `${SITE}/blog/${post.slug}`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.7",
    })),
    ...alleys.map((alley) => ({
      loc: `${SITE}/alley/${alley.slug}`,
      lastmod: alley.updated_at ? alley.updated_at.split("T")[0] : today,
      changefreq: "weekly",
      priority: "0.8",
    })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
};

const renderStaticPage = ({ title, description, canonicalPath, heading, intro, sections = [], links = [], assetTags }) => {
  const bodyHtml = `
    <div class="min-h-screen pb-20">
      <header class="border-b border-border p-4 text-center">
        <h1 class="text-xl text-primary">${formatMaybe(heading)}</h1>
        <p class="text-xs text-muted-foreground mt-1">${formatMaybe(intro)}</p>
      </header>
      <div class="max-w-4xl mx-auto p-4 space-y-4">
        ${sections.map((section) => `<section class="border border-border bg-card p-4 space-y-2"><h2 class="text-sm text-primary">${formatMaybe(section.heading)}</h2><p class="text-sm text-foreground leading-relaxed">${formatMaybe(section.content)}</p></section>`).join("")}
        ${links.length ? `<div class="border border-border bg-card p-4"><ul class="space-y-2">${links.map((link) => `<li><a class="text-primary hover:underline" href="${link.href}">${formatMaybe(link.label)}</a></li>`).join("")}</ul></div>` : ""}
      </div>
    </div>`;

  return buildDocument({ title, description, canonicalPath, bodyHtml, assetTags });
};

const renderAlleyPage = (alley, relatedAlleys, assetTags) => {
  const canonicalPath = `/alley/${alley.slug}`;
  const title = `${alley.name} in ${alley.city}, ${alley.state} | Lanes & Leaderboard | Alley Cat`;
  const description = `Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}. Track your bowling stats and join the ${alley.city} leaderboard on Alley Cat.`;
  const fullAddress = [alley.address, alley.city, alley.state, alley.zip_code].filter(Boolean).join(", ");
  const laneText = alley.lane_count > 0 ? String(alley.lane_count) : "Unknown";
  const phoneText = alley.phone ? `<span>${formatMaybe(alley.phone)}</span>` : `<span class="text-muted-foreground italic">Not listed</span>`;
  const websiteRow = alley.website
    ? `<tr><td class="border border-border p-2 text-muted-foreground bg-muted">Website</td><td class="border border-border p-2"><a href="${escapeHtml(alley.website)}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${formatMaybe(alley.website)}</a></td></tr>`
    : "";

  const otherAlleysHtml = relatedAlleys.length
    ? `<section class="border border-border bg-card p-4">
        <h2 class="text-sm text-primary font-bold mb-3">Other Alleys in ${formatMaybe(alley.state)}</h2>
        <ul class="space-y-2 text-sm text-foreground">
          ${relatedAlleys.map((related) => `<li><a class="text-primary hover:underline" href="/alley/${related.slug}">🎳 ${formatMaybe(related.name)} — ${formatMaybe(related.city)}, ${formatMaybe(related.state)}</a></li>`).join("")}
        </ul>
      </section>`
    : "";

  const aboutHtml = `<section class="border border-border bg-card p-4 space-y-3">
      <h2 class="text-sm text-primary font-bold">About ${formatMaybe(alley.name)}</h2>
      <p class="text-sm text-foreground leading-relaxed">
        ${formatMaybe(alley.name)} is a bowling destination in ${formatMaybe(alley.city)}, ${formatMaybe(alley.state)} where bowlers can settle in for open play, league sessions, and focused practice. With ${formatMaybe(laneText)} lanes, it gives local players a reliable spot to chase cleaner frames and bigger scores.
      </p>
      <p class="text-sm text-muted-foreground leading-relaxed">
        Planning a visit to ${formatMaybe(alley.name)}? Use Alley Cat to log every frame, track spare conversions, monitor your average, and compare your scores with other bowlers on the ${formatMaybe(alley.city)} leaderboard. The goal is simple: turn every trip to ${formatMaybe(alley.name)} into a data-driven bowling session.
      </p>
    </section>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BowlingAlley",
    name: alley.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: alley.address,
      addressLocality: alley.city,
      addressRegion: alley.state,
      ...(alley.zip_code ? { postalCode: alley.zip_code } : {}),
    },
    ...(alley.phone ? { telephone: alley.phone } : {}),
    ...(alley.website ? { url: alley.website } : {}),
  };

  const bodyHtml = `
    <div class="min-h-screen pb-20">
      <header class="border-b border-border p-4">
        <a href="/alleys" class="text-primary text-xs">← Back to Directory</a>
        <div class="flex items-center justify-between mt-1">
          <h1 class="text-lg text-primary">🎳 ${formatMaybe(alley.name).toUpperCase()}</h1>
        </div>
        <hr class="border-primary mt-2" />
      </header>

      <div class="p-4 space-y-4">
        <table class="w-full border-collapse border border-border text-sm">
          <tbody>
            <tr class="bg-muted">
              <td class="border border-border p-2 text-muted-foreground w-24">Address</td>
              <td class="border border-border p-2 text-foreground">${formatMaybe(fullAddress)}</td>
            </tr>
            <tr>
              <td class="border border-border p-2 text-muted-foreground bg-muted">Phone</td>
              <td class="border border-border p-2 text-foreground">${phoneText}</td>
            </tr>
            ${websiteRow}
            <tr>
              <td class="border border-border p-2 text-muted-foreground bg-muted">Lanes</td>
              <td class="border border-border p-2"><span class="text-primary font-bold">${formatMaybe(laneText)}</span></td>
            </tr>
            <tr>
              <td class="border border-border p-2 text-muted-foreground bg-muted">Oil</td>
              <td class="border border-border p-2 text-foreground">${formatMaybe(alley.oil_pattern || "House")}</td>
            </tr>
            <tr>
              <td class="border border-border p-2 text-muted-foreground bg-muted">Alley Rating</td>
              <td class="border border-border p-2 text-primary">${formatMaybe(toRatingText(alley.alley_rating))}</td>
            </tr>
            <tr>
              <td class="border border-border p-2 text-muted-foreground bg-muted">Beer Rating</td>
              <td class="border border-border p-2 text-secondary">${formatMaybe(toRatingText(alley.beer_rating))}</td>
            </tr>
          </tbody>
        </table>

        ${aboutHtml}
        ${otherAlleysHtml}
      </div>
    </div>`;

  return buildDocument({
    title,
    description,
    canonicalPath,
    bodyHtml,
    jsonLd,
    assetTags,
  });
};

const fetchAllAlleys = async () => {
  const batchSize = 1000;
  let from = 0;
  const alleys = [];

  while (true) {
    const { data, error } = await supabase
      .from("alleys")
      .select("id, slug, name, address, city, state, zip_code, phone, website, lane_count, oil_pattern, alley_rating, beer_rating, updated_at")
      .order("name")
      .range(from, from + batchSize - 1);

    if (error) throw error;
    if (!data?.length) break;

    alleys.push(...data);

    if (data.length < batchSize) break;
    from += batchSize;
  }

  return alleys;
};

const writeFile = async (filePath, content) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
};

const updateRootIndex = async (assetTags) => {
  const title = "Alley Cat — Track Bowling Scores, Find Alleys & Compete";
  const description = "Alley Cat is the ultimate bowling companion. Track your scores frame-by-frame, discover bowling alleys, compare stats with friends, and climb the leaderboard.";
  const bodyHtml = `
    <div class="min-h-screen pb-20">
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <div class="border-b border-primary pb-2 mb-4">
          <h1 class="text-lg text-primary font-bold">🏠 HOME FEED</h1>
        </div>
        <div class="max-w-4xl mx-auto px-4 py-6 mt-4 bg-muted/40 border-t border-border">
          <h2 class="text-sm text-primary border-b border-border pb-1 mb-3">🎳 About Alley Cat</h2>
          <div class="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>Alley Cat is the free bowling companion built for everyone — from casual weekend rollers to die-hard league bowlers chasing better numbers, cleaner frames, and bigger series.</p>
            <p>Track scores frame by frame, analyze trends over time, discover bowling alleys across the country, and compete on leaderboards with bowlers in your city and beyond.</p>
            <p>If you want a bowling app that helps you improve while making the game more social, Alley Cat is built for exactly that.</p>
          </div>
        </div>
      </div>
    </div>`;

  await writeFile(path.join(DIST_DIR, "index.html"), buildDocument({
    title,
    description,
    canonicalPath: "/",
    bodyHtml,
    assetTags,
  }));
};

const writeStaticRoutes = async (assetTags) => {
  await writeFile(path.join(DIST_DIR, "alleys", "index.html"), renderStaticPage({
    title: "Find Bowling Alleys Near You — 1,600+ Venues | Alley Cat",
    description: "Browse and search bowling alleys across the US. Filter by state, city, and rating to find the perfect lanes near you.",
    canonicalPath: "/alleys",
    heading: "🎳 ALLEY CAT 🎳",
    intro: "Find Your Lane",
    sections: [
      { heading: "Search Bowling Alleys", content: "Browse alley pages with address details, lane count, oil pattern notes, and community ratings so you can pick the right spot before you head out." },
      { heading: "Track More Than Directions", content: "Each alley page on Alley Cat helps bowlers log scores, compare performance, and discover other venues nearby for future sessions." },
    ],
    assetTags,
  }));

  await writeFile(path.join(DIST_DIR, "leaderboard", "index.html"), renderStaticPage({
    title: "Bowling Leaderboard — Top Bowlers Ranked | Alley Cat",
    description: "See the top-ranked bowlers on Alley Cat. Compare scores, averages, and total points on the global bowling leaderboard.",
    canonicalPath: "/leaderboard",
    heading: "🏆 Global Top Cats",
    intro: "See how bowlers stack up across Alley Cat.",
    sections: [
      { heading: "Track Rankings", content: "The Alley Cat leaderboard helps bowlers compare averages, high scores, and total points while keeping tabs on the players setting the pace." },
      { heading: "Compete With Context", content: "Log your games consistently and use Alley Cat to see how your performance evolves from league nights to casual practice sessions." },
    ],
    assetTags,
  }));

  await writeFile(path.join(DIST_DIR, "blog", "index.html"), renderStaticPage({
    title: "Bowling Tips & Guides — Alley Cat Blog",
    description: "Bowling tips, guides, and resources from Alley Cat. Learn about handicaps, score tracking, finding alleys near you, and more.",
    canonicalPath: "/blog",
    heading: "🎳 Alley Cat Blog",
    intro: "Bowling tips, guides, and resources",
    links: blogPosts.map((post) => ({ href: `/blog/${post.slug}`, label: post.title })),
    assetTags,
  }));

  for (const post of blogPosts) {
    await writeFile(path.join(DIST_DIR, "blog", post.slug, "index.html"), renderStaticPage({
      title: post.title,
      description: post.description,
      canonicalPath: `/blog/${post.slug}`,
      heading: post.title,
      intro: post.intro,
      sections: [
        { heading: "Why It Matters", content: post.description },
        { heading: "How Alley Cat Helps", content: `${post.intro} Use Alley Cat to track games, compare bowling performance, and discover new alleys with better context.` },
      ],
      assetTags,
    }));
  }
};

const main = async () => {
  const baseHtml = await fs.readFile(ROOT_INDEX_PATH, "utf8");
  const assetTags = Array.from(baseHtml.matchAll(/<(?:link|script)\b[^>]*(?:><\/script>|\/?>)/g))
    .map((match) => match[0])
    .join("\n    ");

  const alleys = await fetchAllAlleys();
  const alleysByState = new Map();

  for (const alley of alleys) {
    const list = alleysByState.get(alley.state) || [];
    list.push(alley);
    alleysByState.set(alley.state, list);
  }

  await updateRootIndex(assetTags);
  await writeStaticRoutes(assetTags);
  await writeFile(path.join(DIST_DIR, "sitemap.xml"), buildSitemapXml(alleys));

  for (const alley of alleys) {
    const relatedAlleys = (alleysByState.get(alley.state) || [])
      .filter((candidate) => candidate.id !== alley.id && !/test alley/i.test(candidate.name || ""))
      .slice(0, 5);

    const html = renderAlleyPage(alley, relatedAlleys, assetTags);
    const filePath = path.join(DIST_DIR, "alley", alley.slug, "index.html");
    await writeFile(filePath, html);
  }

  console.log(`Prerendered ${alleys.length} alley pages.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});