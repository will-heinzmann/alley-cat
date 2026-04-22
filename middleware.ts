/**
 * Vercel Edge Middleware — dynamic rendering for SEO.
 *
 * When a request comes from a known bot/crawler user-agent and targets a
 * prerenderable route, we rewrite the response to come from the Supabase
 * `seo-proxy` edge function (rich HTML with unique meta tags, body copy,
 * and JSON-LD). Real users get the static SPA.
 *
 * No-op on Lovable hosting; only runs when deployed on Vercel.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SEO_PROXY_URL =
  "https://iwtaccnyzfxxlohskkal.supabase.co/functions/v1/seo-proxy";

const BOT_REGEX =
  /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|embedly|pinterest|slackbot|discordbot|whatsapp|telegrambot|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|sitebulb|screaming\s?frog|ubersuggest|bingpreview|chrome-lighthouse|crawler|spider|bot)/i;

const PRERENDERABLE_PATH =
  /^\/(|alleys|leaderboard|blog|blog\/[^/]+|alley\/[^/]+|tools\/bowling-score-calculator)$/;

export const config = {
  matcher: [
    "/",
    "/alleys",
    "/leaderboard",
    "/blog",
    "/blog/:slug",
    "/alley/:slug",
    "/tools/bowling-score-calculator",
  ],
};

export default async function middleware(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") || "";
  const path =
    req.nextUrl.pathname.length > 1 && req.nextUrl.pathname.endsWith("/")
      ? req.nextUrl.pathname.slice(0, -1)
      : req.nextUrl.pathname;

  if (!BOT_REGEX.test(userAgent) || !PRERENDERABLE_PATH.test(path)) {
    return NextResponse.next();
  }

  const proxyUrl = new URL(SEO_PROXY_URL);
  proxyUrl.searchParams.set("path", path);

  try {
    const response = await fetch(proxyUrl.toString(), {
      headers: { "user-agent": userAgent },
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=86400",
        "x-prerendered": "true",
      },
    });
  } catch {
    return NextResponse.next();
  }
}
