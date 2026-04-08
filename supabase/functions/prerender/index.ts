import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SITE = "https://alleycat-bowling.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const pageHeaders = {
  ...corsHeaders,
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
};

// Blog posts data (mirrored from src/data/blogPosts.ts)
const blogPosts = [
  { slug: "how-to-calculate-bowling-handicap", title: "How to Calculate Bowling Handicap — Easy Guide (2026)", description: "Learn how to calculate your bowling handicap step-by-step. Use the standard formula with basis score, average, and percentage factor.", content: "A bowling handicap is a scoring adjustment that allows bowlers of different skill levels to compete fairly. It's calculated based on the difference between your average score and a predetermined basis score (usually 200 or 220). The standard formula is: Handicap = (Basis Score − Your Average) × Percentage Factor. For example, if the basis score is 220, your average is 150, and the percentage factor is 80%: Handicap = (220 − 150) × 0.80 = 56. You would add 56 pins to each game score. Your bowling average is the total pins knocked down divided by the number of games played. Instead of calculating your average by hand, use Alley Cat to log every game and your rolling average is computed automatically." },
  { slug: "alley-cat-bowling", title: "Alley Cat Bowling — The Social Bowling App for Every Bowler", description: "Alley Cat is a free bowling app to track scores, find alleys, and compete on leaderboards. Built for casual and league bowlers alike.", content: "Alley Cat is a free web app that lets you log bowling games frame-by-frame, track your stats over time, discover bowling alleys across the country, and compete on local and global leaderboards. Think of it as Strava, but for bowling. Features include frame-by-frame scoring with pin-mode input, series summaries, a directory of 2,000+ bowling alleys with ratings and reviews, home alley leaderboards, group play mode for bowling with friends, and a social feed to follow other bowlers." },
  { slug: "bowling-stat-tracker", title: "Best Bowling Stat Tracker — Track Scores, Averages & Trends", description: "Find the best bowling stat tracker to log games, monitor averages, and analyze performance trends. Free and easy to use.", content: "Serious bowlers know that improvement starts with data. A good stat tracker helps you see patterns, set goals, and measure progress over time. Frame-by-frame tracking shows you where you're leaving pins, which spares you're converting, and how you perform under pressure in the late frames. Alley Cat combines deep stat tracking with social features and an alley directory — all in one free app." },
  { slug: "bowling-scorecard-app", title: "Free Bowling Scorecard App — Log Games Frame by Frame", description: "Use a free bowling scorecard app to log games frame-by-frame, track strikes and spares, and calculate scores automatically.", content: "Forget pen and paper. A digital bowling scorecard app makes it easy to log every roll, track your stats, and share results with friends. A digital scorecard app saves every game permanently, calculates scores automatically including strike and spare bonuses, and lets you look back at any game you've ever bowled. Alley Cat provides both a quick number pad for fast entry and a visual Pin Mode that shows the actual pin deck." },
  { slug: "bowling-alleys-near-me", title: "Find Bowling Alleys Near Me — 2,000+ Locations with Ratings", description: "Search 2,000+ bowling alleys near you with ratings, reviews, and details like lane count and oil patterns. Find your next lane.", content: "Looking for a bowling alley nearby? Alley Cat has a directory of over 2,000 bowling alleys across the United States — complete with ratings, reviews, and details you won't find on Google. Search by city, state, or name. Switch to Map View to see every alley plotted on an interactive map. Every alley on Alley Cat can be rated and reviewed by the community." },
  { slug: "bowling-score-tracker", title: "Bowling Score Tracker — Free Online Tool to Log Every Game", description: "Track your bowling scores online for free. Log games, calculate averages, and monitor your improvement over time with Alley Cat.", content: "A bowling score tracker helps you stay on top of your game. Log every session, watch your average climb, and never lose track of a personal best. With Alley Cat, logging a game takes under a minute. Select your alley, enter your score or use frame-by-frame input, and you're done. The app calculates everything else — your average, high game, series stats, and more." },
  { slug: "bowling-scoreboard-online", title: "Free Online Bowling Scoreboard — Score Games Live", description: "Use a free online bowling scoreboard to score games live with friends. Supports group play, pin-by-pin input, and shareable results.", content: "Need an online bowling scoreboard? Whether you're at the alley or setting up a home bowling tournament, Alley Cat gives you a clean, easy-to-use digital scoreboard. Group Play mode turns your phone or tablet into a live scoreboard. Add players including guests without accounts, and score each turn frame by frame. The board updates in real time as each player bowls." },
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value: string | null | undefined, fallback = "") {
  return escapeHtml(value?.trim() || fallback);
}

function safeJson(value: object) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function htmlShell(title: string, description: string, canonicalPath: string, bodyHtml: string, jsonLd?: object) {
  const canonicalUrl = `${SITE}${canonicalPath}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Alley Cat">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${jsonLd ? `<script type="application/ld+json">${safeJson(jsonLd)}</script>` : ""}
</head>
<body>
  ${bodyHtml}
  <p><a href="${escapeHtml(canonicalUrl)}">View on Alley Cat →</a></p>
</body>
</html>`;
}

async function renderAlley(slug: string): Promise<Response | null> {
  const { data: alley, error } = await supabase
    .from("alleys")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !alley) return null;

  const { count: reviewCount } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("alley_id", alley.id);

  const { data: relatedAlleys } = await supabase
    .from("alleys")
    .select("name, slug, city")
    .eq("state", alley.state)
    .neq("id", alley.id)
    .not("name", "ilike", "%test%")
    .order("created_at", { ascending: false })
    .limit(5);

  const title = `${alley.name} in ${alley.city}, ${alley.state} | Lanes & Leaderboard | Alley Cat`;
  const description = `Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}. Track your bowling stats and join the ${alley.city} leaderboard on Alley Cat.`;
  const laneText = alley.lane_count > 0 ? String(alley.lane_count) : "multiple";
  const ratingText = alley.alley_rating > 0 ? `${alley.alley_rating}` : "N/A";
  const addressLine = [alley.address, alley.city, alley.state, alley.zip_code].filter(Boolean).join(", ");
  const safeName = normalizeText(alley.name);
  const safeAddress = normalizeText(addressLine);
  const safePhone = alley.phone ? normalizeText(alley.phone) : "";
  const safeLaneText = normalizeText(laneText);
  const safeRatingText = normalizeText(ratingText);
  const safeOilPattern = normalizeText(alley.oil_pattern || "House");
  const safeWebsite = alley.website ? alley.website.trim() : "";
  const safeWebsiteLabel = safeWebsite ? escapeHtml(safeWebsite) : "";
  const safeCity = normalizeText(alley.city);
  const safeState = normalizeText(alley.state);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BowlingAlley",
    name: alley.name,
    address: { "@type": "PostalAddress", streetAddress: alley.address, addressLocality: alley.city, addressRegion: alley.state, postalCode: alley.zip_code || undefined },
    ...(alley.phone && { telephone: alley.phone }),
    ...(alley.website && { url: alley.website }),
    ...(alley.alley_rating > 0 && { aggregateRating: { "@type": "AggregateRating", ratingValue: alley.alley_rating, bestRating: 5, reviewCount: reviewCount || 1 } }),
  };

  const relatedHtml = (relatedAlleys || [])
    .map((a: any) => `<li><a href="${SITE}/alley/${encodeURIComponent(a.slug)}">🎳 ${escapeHtml(a.name)}</a> — ${escapeHtml(a.city)}, ${safeState}</li>`)
    .join("\n");

  const bodyHtml = `
  <main>
    <article>
      <h1>${safeName}</h1>
      <p>${safeAddress}</p>
      ${alley.phone ? `<p>Phone: ${safePhone}</p>` : ""}
      <p>Lanes: ${safeLaneText}</p>
      <p>Rating: ${safeRatingText}/5</p>
      <p>Oil Pattern: ${safeOilPattern}</p>
      ${safeWebsite ? `<p>Website: <a href="${escapeHtml(safeWebsite)}">${safeWebsiteLabel}</a></p>` : ""}
      <h2>About ${safeName}</h2>
      <p>${safeName} is a bowling destination in ${safeCity}, ${safeState}. With approximately ${safeLaneText} lanes, it offers space for casual games, league nights, and practice sessions for bowlers working on consistency.</p>
      <p>If you're planning a trip to ${safeName}, use Alley Cat to log every frame, track spare conversions, and compare your performance with other bowlers on the ${safeCity} leaderboard.</p>
    </article>
  </main>
  ${relatedAlleys && relatedAlleys.length > 0 ? `<h2>Other Alleys in ${alley.state}</h2><ul>${relatedHtml}</ul>` : ""}`;

  return new Response(htmlShell(title, description, `/alley/${alley.slug}`, bodyHtml, jsonLd), {
    headers: pageHeaders,
  });
}

function renderHome(): Response {
  const title = "Alley Cat — Track Bowling Scores, Find Alleys & Compete";
  const description = "Alley Cat is the free bowling app to log games frame-by-frame, track your stats, discover 2,000+ alleys, and compete on leaderboards. Like Strava, but for bowling.";
  const jsonLd = { "@context": "https://schema.org", "@type": "WebApplication", name: "Alley Cat", url: SITE, applicationCategory: "SportsApplication", description, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  const bodyHtml = `
  <h1>Alley Cat — The Social Bowling App</h1>
  <p>Alley Cat is a free bowling score tracker and social platform built for every bowler — from casual Friday-nighters to competitive league players.</p>
  <h2>Track Every Game</h2>
  <p>Log your bowling games frame-by-frame with our intuitive pin-mode or number pad input. Your rolling average, high game, series stats, strike rate, and 200+ rate are all calculated automatically.</p>
  <h2>Find Bowling Alleys</h2>
  <p>Browse our directory of over 2,000 bowling alleys across the United States. Search by city, state, or name. View ratings, reviews, lane counts, oil patterns, and more — all contributed by real bowlers.</p>
  <h2>Compete on Leaderboards</h2>
  <p>See where you rank among bowlers at your home alley or across the entire Alley Cat community. Toggle between weekly and all-time views to see who's on top.</p>
  <h2>Social Features</h2>
  <p>Follow other bowlers, like their games, and track your friends' progress on the social feed. Group Play mode lets you score games with friends — even guests who don't have an account.</p>
  <p>Alley Cat is completely free. No subscriptions, no paywalls. Sign up and start bowling.</p>`;
  return new Response(htmlShell(title, description, "/", bodyHtml, jsonLd), {
    headers: pageHeaders,
  });
}

function renderBlogIndex(): Response {
  const title = "Bowling Tips & Guides | Alley Cat Blog";
  const description = "Read bowling tips, guides, and strategies on the Alley Cat blog. Learn about handicaps, score tracking, finding alleys near you, and more.";
  const listHtml = blogPosts.map((p) => `<li><a href="${SITE}/blog/${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a><br><small>${escapeHtml(p.description)}</small></li>`).join("\n");
  const bodyHtml = `<h1>Alley Cat Blog — Bowling Tips & Guides</h1><ul>${listHtml}</ul>`;
  return new Response(htmlShell(title, description, "/blog", bodyHtml), {
    headers: pageHeaders,
  });
}

function renderBlogPost(slug: string): Response | null {
  const post = blogPosts.find(p => p.slug === slug);
  if (!post) return null;
  const jsonLd = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description, url: `${SITE}/blog/${post.slug}`, publisher: { "@type": "Organization", name: "Alley Cat" } };
  const bodyHtml = `<h1>${escapeHtml(post.title)}</h1><p>${escapeHtml(post.content)}</p><p><a href="${SITE}/blog">← Back to all articles</a></p>`;
  return new Response(htmlShell(post.title, post.description, `/blog/${post.slug}`, bodyHtml, jsonLd), {
    headers: pageHeaders,
  });
}

function renderAlleys(): Response {
  const title = "Find Bowling Alleys Near You — 2,000+ Locations | Alley Cat";
  const description = "Search over 2,000 bowling alleys across the United States. Filter by city, state, or rating. View lane counts, oil patterns, reviews, and leaderboards.";
  const bodyHtml = `
  <h1>Find Bowling Alleys Near You</h1>
  <p>Alley Cat features a directory of over 2,000 bowling alleys across the United States. Search by city, state, or alley name. Filter by rating to find the best spots near you.</p>
  <h2>What You'll Find</h2>
  <p>Each alley page includes the address, phone number, website, lane count, oil pattern, community ratings, reviews from real bowlers, and a leaderboard of top scores bowled at that location.</p>
  <h2>Rate & Review</h2>
  <p>Been to an alley? Leave a rating and review to help other bowlers find the best lanes. Rate the overall experience, beer selection, and oil conditions.</p>
  <p><a href="${SITE}">Sign up for Alley Cat</a> to start discovering and reviewing bowling alleys today.</p>`;
  return new Response(htmlShell(title, description, "/alleys", bodyHtml), {
    headers: pageHeaders,
  });
}

function renderLeaderboard(): Response {
  const title = "Bowling Leaderboard — Top Scores & Rankings | Alley Cat";
  const description = "See who's on top of the Alley Cat bowling leaderboard. Compare scores, averages, and rankings across all bowlers or filter by your home alley.";
  const bodyHtml = `
  <h1>Alley Cat Leaderboard</h1>
  <p>The Alley Cat leaderboard ranks bowlers by their scores and averages. See where you stand among the entire community or filter by a specific bowling alley to compare against the local regulars.</p>
  <h2>How It Works</h2>
  <p>Every game you log on Alley Cat counts toward your leaderboard ranking. Your position is determined by your highest scores and bowling average. Toggle between weekly and all-time views to see who's hot right now.</p>
  <p>Log games consistently and watch yourself climb the ranks. <a href="${SITE}">Join Alley Cat</a> to start competing.</p>`;
  return new Response(htmlShell(title, description, "/leaderboard", bodyHtml), {
    headers: pageHeaders,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "";
  const slug = url.searchParams.get("slug");

  // Legacy support: ?slug= for alley pages
  if (slug) {
    const resp = await renderAlley(slug);
    return resp || new Response("Not found", { status: 404, headers: corsHeaders });
  }

  // Route by path
  if (path === "/" || path === "") {
    return renderHome();
  }

  const alleyMatch = path.match(/^\/alley\/([^/]+)$/);
  if (alleyMatch) {
    const resp = await renderAlley(alleyMatch[1]);
    return resp || new Response("Not found", { status: 404, headers: corsHeaders });
  }

  const blogPostMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogPostMatch) {
    return renderBlogPost(blogPostMatch[1]) || new Response("Not found", { status: 404, headers: corsHeaders });
  }

  if (path === "/blog") {
    return renderBlogIndex();
  }

  if (path === "/alleys") {
    return renderAlleys();
  }

  if (path === "/leaderboard") {
    return renderLeaderboard();
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
});
