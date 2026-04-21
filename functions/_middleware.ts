/**
 * Cloudflare Pages middleware — dynamic rendering for SEO.
 *
 * When a request comes from a known bot/crawler user-agent and targets a
 * prerenderable route (/, /alleys, /leaderboard, /blog, /blog/:slug,
 * /alley/:slug), we proxy the response from the Supabase `seo-proxy`
 * edge function which returns rich, unique HTML with proper <title>,
 * <meta name="description">, canonical, OG tags, JSON-LD, and body copy.
 *
 * Real users always get the static SPA (index.html), so URLs stay clean
 * and the React app behaves normally for humans.
 *
 * This file is a no-op on Lovable hosting (which ignores it) and only
 * activates when deployed on Cloudflare Pages.
 */

const SEO_PROXY_URL =
  "https://iwtaccnyzfxxlohskkal.supabase.co/functions/v1/seo-proxy";

const BOT_REGEX =
  /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|embedly|pinterest|slackbot|discordbot|whatsapp|telegrambot|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|sitebulb|screaming\s?frog|ubersuggest|bingpreview|chrome-lighthouse|crawler|spider|bot)/i;

const PRERENDERABLE_PATH =
  /^\/(|alleys|leaderboard|blog|blog\/[^/]+|alley\/[^/]+)$/;

export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get("user-agent") || "";
  const path =
    url.pathname.length > 1 && url.pathname.endsWith("/")
      ? url.pathname.slice(0, -1)
      : url.pathname;

  const isBot = BOT_REGEX.test(userAgent);
  const isPrerenderable = PRERENDERABLE_PATH.test(path);

  if (!isBot || !isPrerenderable) {
    return next();
  }

  try {
    const proxyUrl = new URL(SEO_PROXY_URL);
    proxyUrl.searchParams.set("path", path);

    const response = await fetch(proxyUrl.toString(), {
      headers: { "user-agent": userAgent },
    });

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=86400",
        "x-prerendered": "true",
      },
    });
  } catch {
    return next();
  }
};
