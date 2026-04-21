// Shared HTML templating used by the build-time static generator.
// Mirrors the logic in supabase/functions/prerender/index.ts so that
// crawlers fetching /alley/<slug>/index.html get the same content
// they'd get from the seo-proxy edge function.

export const SITE = "https://alleycat-bowling.com";

export interface AlleyRow {
  slug: string;
  name: string;
  city: string;
  state: string;
  address: string;
  zip_code: string | null;
  phone: string | null;
  website: string | null;
  lane_count: number;
  alley_rating: number;
  oil_pattern: string | null;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeJson(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function generateAlleyDescription(
  name: string,
  city: string,
  state: string,
  laneCount: number,
  rating: number
): string {
  const h = simpleHash(name);
  const lt = laneCount > 0 ? `${laneCount}` : "multiple";
  const hasRating = rating > 0;

  const openers = [
    `${name} is a popular bowling destination in ${city}, ${state}, welcoming bowlers of every skill level.`,
    `Located in ${city}, ${state}, ${name} is a local favorite for league nights, casual outings, and competitive practice.`,
    `Whether you're a first-timer or a seasoned league bowler, ${name} in ${city}, ${state} has something for everyone.`,
    `${name} stands out as one of the go-to bowling venues in the ${city}, ${state} area.`,
    `Bowlers across ${city}, ${state} know ${name} as a reliable spot to roll a few games and have a great time.`,
    `Looking for lanes in ${city}? ${name} is one of ${state}'s well-known bowling centers, drawing crowds from across the region.`,
    `${name}, situated in ${city}, ${state}, has earned a reputation as a welcoming bowling center for players at every level.`,
    `For bowlers in the ${city} area, ${name} is a trusted destination for practice sessions, league play, and family fun.`,
    `${city}, ${state} is home to ${name}, a bowling center that caters to casual visitors and competitive players alike.`,
    `If you're searching for bowling near ${city}, ${name} is a standout choice in ${state}.`,
  ];
  const lanes = [
    `The center features ${lt} lanes, providing plenty of room for open bowling, tournaments, and league nights.`,
    `With ${lt} lanes available, ${name} can accommodate everything from solo practice to large group events.`,
    `Equipped with ${lt} lanes, the facility offers ample space for bowlers to work on their game or enjoy a night out.`,
    `${name} operates ${lt} lanes, making it a solid option for both walk-in bowlers and organized leagues.`,
    `Featuring ${lt} lanes, this center gives bowlers room to practice spare conversions, test new equipment, and compete.`,
    `The venue boasts ${lt} lanes — enough to host weekly leagues, birthday parties, and corporate events side by side.`,
    `At ${lt} lanes, ${name} offers a comfortable bowling experience without long waits during peak hours.`,
    `${name} keeps ${lt} lanes ready for action, serving the ${city} community with consistent lane conditions.`,
  ];
  const rated = hasRating
    ? [
        `The community has given it a ${rating}-star rating, reflecting the quality of its lanes and atmosphere.`,
        `With a community rating of ${rating} out of 5, it's clear that local bowlers appreciate what ${name} brings to the table.`,
        `Rated ${rating}/5 by fellow bowlers, ${name} consistently delivers a dependable bowling experience.`,
        `A ${rating}-star community rating speaks to the center's commitment to well-maintained lanes and a friendly environment.`,
        `Bowlers have rated ${name} ${rating} out of 5 stars, a testament to its solid lane conditions and welcoming vibe.`,
        `Earning ${rating} stars from the Alley Cat community, ${name} is a proven choice for quality bowling in ${state}.`,
      ]
    : [
        `As more bowlers visit and leave reviews, ${name}'s reputation in the ${city} area continues to grow.`,
        `Be one of the first to rate ${name} on Alley Cat and help fellow bowlers discover this ${city} gem.`,
        `${name} is waiting for its first community ratings — visit and share your experience with other bowlers.`,
        `The ${city} bowling scene benefits from centers like ${name} that keep the sport accessible and enjoyable.`,
        `${name} is an important part of the ${city} bowling landscape, offering a place for the community to gather and compete.`,
        `Local bowlers in ${city} count on venues like ${name} to keep the sport thriving in ${state}.`,
      ];
  const ctas = [
    `Use Alley Cat to log your games at ${name}, track your rolling average, and see how you stack up on the ${city} leaderboard.`,
    `Planning a visit? Open Alley Cat to record every frame, monitor your spare conversion rate, and compete on the local leaderboard.`,
    `Track your performance at ${name} with Alley Cat — log scores frame by frame, analyze trends, and climb the ${city} rankings.`,
    `Next time you bowl at ${name}, use Alley Cat to capture your scores and compare your stats against other ${city} bowlers.`,
    `Alley Cat makes it easy to turn every session at ${name} into data you can learn from — averages, strike rates, and more.`,
    `Whether it's league night or open bowling, Alley Cat helps you get the most out of every game at ${name}.`,
    `Sign up for Alley Cat to start tracking your games at ${name} and join the growing community of bowlers in ${state}.`,
    `From casual games to serious league play, Alley Cat is the perfect companion for every visit to ${name}.`,
  ];

  return `${openers[h % openers.length]} ${lanes[(h >> 3) % lanes.length]} ${rated[(h >> 6) % rated.length]} ${ctas[(h >> 9) % ctas.length]}`;
}

/**
 * Inject SEO content into the existing index.html shell.
 * - Replaces <title> and adds <meta name="description"> + canonical + JSON-LD in <head>.
 * - Injects a hidden <div id="seo-content"> in <body> BEFORE the React root,
 *   so the bot sees full text content immediately while React still hydrates normally.
 */
export function injectSeoIntoShell(
  shell: string,
  opts: {
    title: string;
    description: string;
    canonicalPath: string;
    bodyHtml: string;
    jsonLd?: object;
  }
): string {
  const canonicalUrl = `${SITE}${opts.canonicalPath}`;
  const headInjection = `
    <meta name="description" content="${escapeHtml(opts.description)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(opts.title)}" />
    <meta property="og:description" content="${escapeHtml(opts.description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Alley Cat" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(opts.title)}" />
    <meta name="twitter:description" content="${escapeHtml(opts.description)}" />
    ${opts.jsonLd ? `<script type="application/ld+json">${safeJson(opts.jsonLd)}</script>` : ""}
  `;

  const bodyInjection = `<div id="seo-content" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;">${opts.bodyHtml}</div>`;

  return shell
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(opts.title)}</title>`)
    .replace(/<\/head>/i, `${headInjection}\n  </head>`)
    .replace(/<div id="root">/i, `${bodyInjection}\n    <div id="root">`);
}

export function buildAlleyHtml(shell: string, alley: AlleyRow): string {
  const title = `${alley.name} in ${alley.city}, ${alley.state} | Lanes & Leaderboard | Alley Cat`;
  const description = `Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}. Track your bowling stats and join the ${alley.city} leaderboard on Alley Cat.`;
  const laneText = alley.lane_count > 0 ? String(alley.lane_count) : "multiple";
  const ratingText = alley.alley_rating > 0 ? `${alley.alley_rating}` : "N/A";
  const addressLine = [alley.address, alley.city, alley.state, alley.zip_code].filter(Boolean).join(", ");
  const safeName = escapeHtml(alley.name);
  const safeAddress = escapeHtml(addressLine);
  const safeCity = escapeHtml(alley.city);
  const safeState = escapeHtml(alley.state);
  const safePhone = alley.phone ? escapeHtml(alley.phone) : "";
  const safeOilPattern = escapeHtml(alley.oil_pattern || "House");
  const safeWebsite = alley.website ? alley.website.trim() : "";
  const seoDescription = escapeHtml(
    generateAlleyDescription(alley.name, alley.city, alley.state, alley.lane_count, alley.alley_rating)
  );

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
        reviewCount: 1,
      },
    }),
  };

  const bodyHtml = `
    <main>
      <article>
        <h1>${safeName} – ${safeCity}, ${safeState}</h1>
        <h2>About ${safeName}</h2>
        <p>${seoDescription}</p>
        <p><strong>Address:</strong> ${safeAddress}</p>
        ${alley.phone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ""}
        <p><strong>Lanes:</strong> ${escapeHtml(laneText)}</p>
        <p><strong>Rating:</strong> ${escapeHtml(ratingText)}/5</p>
        <p><strong>Oil Pattern:</strong> ${safeOilPattern}</p>
        ${safeWebsite ? `<p><strong>Website:</strong> <a href="${escapeHtml(safeWebsite)}">${escapeHtml(safeWebsite)}</a></p>` : ""}
      </article>
    </main>
  `.trim();

  return injectSeoIntoShell(shell, {
    title,
    description,
    canonicalPath: `/alley/${alley.slug}`,
    bodyHtml,
    jsonLd,
  });
}

export interface CityGroup {
  citySlug: string;
  city: string;
  state: string;
  alleys: { name: string; slug: string; rating: number }[];
}

export function buildCityHtml(shell: string, group: CityGroup): string {
  const title = `Best Bowling Alleys in ${group.city}, ${group.state} | Alley Cat`;
  const description = `Discover the top-rated bowling alleys in ${group.city}, ${group.state}. Browse ratings, reviews, and lane details for ${group.alleys.length} bowling centers on Alley Cat.`;

  const listItems = group.alleys
    .map(
      (a, i) =>
        `<li><a href="${SITE}/alley/${encodeURIComponent(a.slug)}">${escapeHtml(a.name)}</a>${a.rating > 0 ? ` — ${a.rating}/5` : ""}</li>`
    )
    .join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Bowling alleys in ${group.city}, ${group.state}`,
    itemListElement: group.alleys.slice(0, 10).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/alley/${a.slug}`,
      name: a.name,
    })),
  };

  const bodyHtml = `
    <main>
      <h1>Best Bowling Alleys in ${escapeHtml(group.city)}, ${escapeHtml(group.state)}</h1>
      <p>Looking for bowling alleys in ${escapeHtml(group.city)}, ${escapeHtml(group.state)}? Browse ${group.alleys.length} bowling centers, read community reviews, and find your next lane on Alley Cat.</p>
      <ol>${listItems}</ol>
    </main>
  `.trim();

  return injectSeoIntoShell(shell, {
    title,
    description,
    canonicalPath: `/city/${group.citySlug}`,
    bodyHtml,
    jsonLd,
  });
}
