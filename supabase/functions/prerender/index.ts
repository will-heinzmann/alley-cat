import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SITE = "https://alley-cat.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response("Missing ?slug= parameter", { status: 400, headers: corsHeaders });
  }

  const { data: alley, error } = await supabase
    .from("alleys")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !alley) {
    return new Response("Alley not found", { status: 404, headers: corsHeaders });
  }

  // Fetch reviews count
  const { count: reviewCount } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("alley_id", alley.id);

  // Fetch related alleys
  const { data: relatedAlleys } = await supabase
    .from("alleys")
    .select("name, slug, city")
    .eq("state", alley.state)
    .neq("id", alley.id)
    .not("name", "ilike", "%test%")
    .order("created_at", { ascending: false })
    .limit(5);

  const canonicalUrl = `${SITE}/alley/${alley.slug}`;
  const title = `${alley.name} in ${alley.city}, ${alley.state} | Lanes & Leaderboard | Alley Cat`;
  const description = `Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}. Track your bowling stats and join the ${alley.city} leaderboard on Alley Cat.`;
  const laneText = alley.lane_count > 0 ? String(alley.lane_count) : "multiple";
  const ratingText = alley.alley_rating > 0 ? `${alley.alley_rating}` : "N/A";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BowlingAlley",
    name: alley.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: alley.address,
      addressLocality: alley.city,
      addressRegion: alley.state,
      postalCode: alley.zip_code || undefined,
    },
    ...(alley.phone && { telephone: alley.phone }),
    ...(alley.website && { url: alley.website }),
    ...(alley.alley_rating > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: alley.alley_rating,
        bestRating: 5,
        reviewCount: reviewCount || 1,
      },
    }),
  };

  const relatedHtml = (relatedAlleys || [])
    .map((a: any) => `<li><a href="${SITE}/alley/${a.slug}">🎳 ${a.name}</a> — ${a.city}, ${alley.state}</li>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${alley.name} in ${alley.city}, ${alley.state} | Alley Cat">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Alley Cat">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <h1>${alley.name}</h1>
  <p>${alley.address}, ${alley.city}, ${alley.state} ${alley.zip_code || ""}</p>
  ${alley.phone ? `<p>Phone: ${alley.phone}</p>` : ""}
  <p>Lanes: ${laneText}</p>
  <p>Rating: ${ratingText}/5</p>
  <p>Oil Pattern: ${alley.oil_pattern}</p>
  ${alley.website ? `<p>Website: <a href="${alley.website}">${alley.website}</a></p>` : ""}

  <h2>About ${alley.name}</h2>
  <p>${alley.name} is a prominent bowling destination located in ${alley.city}, ${alley.state}. Equipped with approximately ${laneText} lanes, it provides a great environment for both casual bowlers and league players.</p>
  <p>Use <a href="${SITE}">Alley Cat</a> to track your scores frame-by-frame, analyze spare conversions, and see how you compare on the ${alley.city} leaderboard.</p>

  ${relatedAlleys && relatedAlleys.length > 0 ? `
  <h2>Other Alleys in ${alley.state}</h2>
  <ul>${relatedHtml}</ul>` : ""}

  <p><a href="${canonicalUrl}">View full page on Alley Cat →</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
});
