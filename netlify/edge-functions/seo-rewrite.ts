/**
 * Netlify Edge Function — dynamic rendering for SEO.
 *
 * When a bot user-agent hits a prerenderable route, proxy to the Supabase
 * `seo-proxy` edge function which returns rich, route-specific HTML.
 * Real users get the static SPA, keeping URLs clean.
 *
 * Wired up via netlify.toml (path = "/*").
 */

import type { Context } from "https://edge.netlify.com";

const SEO_PROXY_URL =
  "https://iwtaccnyzfxxlohskkal.supabase.co/functions/v1/seo-proxy";

const BOT_REGEX =
  /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|embedly|pinterest|slackbot|discordbot|whatsapp|telegrambot|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|sitebulb|screaming\s?frog|ubersuggest|bingpreview|chrome-lighthouse|crawler|spider|bot)/i;

const PRERENDERABLE_PATH =
  /^\/(|alleys|leaderboard|blog|blog\/[^/]+|alley\/[^/]+)$/;

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get("user-agent") || "";
  const path =
    url.pathname.length > 1 && url.pathname.endsWith("/")
      ? url.pathname.slice(0, -1)
      : url.pathname;

  if (!BOT_REGEX.test(userAgent) || !PRERENDERABLE_PATH.test(path)) {
    return context.next();
  }

  const proxyUrl = new URL(SEO_PROXY_URL);
  proxyUrl.searchParams.set("path", path);

  try {
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
    return context.next();
  }
};
