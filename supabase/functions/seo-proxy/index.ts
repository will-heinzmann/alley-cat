const SITE = "https://alleycat-bowling.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_REGEX = /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|embedly|pinterest|slackbot|discordbot|whatsapp|telegrambot|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|sitebulb|screaming frog|ubersuggest|bingpreview|crawler|spider|bot)/i;

function normalizePath(rawPath: string | null, slug: string | null) {
  if (slug?.trim()) {
    return `/alley/${slug.trim()}`;
  }

  const input = rawPath?.trim();
  if (!input) {
    return "/";
  }

  const pathname = new URL(input, SITE).pathname;
  const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (
    normalized === "/" ||
    normalized === "/blog" ||
    normalized === "/alleys" ||
    normalized === "/leaderboard" ||
    normalized === "/tools/bowling-score-calculator" ||
    /^\/alley\/[^/]+$/.test(normalized) ||
    /^\/blog\/[^/]+$/.test(normalized)
  ) {
    return normalized;
  }

  return null;
}

function isBot(userAgent: string | null) {
  return BOT_REGEX.test(userAgent || "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = normalizePath(url.searchParams.get("path"), url.searchParams.get("slug"));

  if (!path) {
    return new Response("Invalid path", { status: 400, headers: corsHeaders });
  }

  // Serve prerendered HTML to all visitors — only bots follow sitemap URLs here anyway

  const prerenderUrl = new URL(`${SUPABASE_URL}/functions/v1/prerender`);
  prerenderUrl.searchParams.set("path", path);

  try {
    const prerenderResponse = await fetch(prerenderUrl, {
      headers: {
        "user-agent": req.headers.get("user-agent") || "seo-proxy",
      },
    });

    const body = await prerenderResponse.text();
    const headers = new Headers(prerenderResponse.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Headers", corsHeaders["Access-Control-Allow-Headers"]);

    return new Response(body, {
      status: prerenderResponse.status,
      headers,
    });
  } catch {
    return new Response("Failed to load prerendered page", {
      status: 502,
      headers: corsHeaders,
    });
  }
});