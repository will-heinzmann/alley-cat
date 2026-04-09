/**
 * Generates a unique, SEO-optimized description for an alley page.
 * Uses a simple hash of the alley name to deterministically pick sentence
 * structures so every page is different but stable across renders.
 */

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface AlleyDescData {
  name: string;
  city: string;
  state: string;
  lane_count: number;
  alley_rating: number;
}

export function generateAlleyDescription(alley: AlleyDescData): string {
  const h = simpleHash(alley.name);
  const laneText = alley.lane_count > 0 ? `${alley.lane_count}` : "multiple";
  const hasRating = alley.alley_rating > 0;

  // Opener variations (10)
  const openers = [
    `${alley.name} is a popular bowling destination in ${alley.city}, ${alley.state}, welcoming bowlers of every skill level.`,
    `Located in ${alley.city}, ${alley.state}, ${alley.name} is a local favorite for league nights, casual outings, and competitive practice.`,
    `Whether you're a first-timer or a seasoned league bowler, ${alley.name} in ${alley.city}, ${alley.state} has something for everyone.`,
    `${alley.name} stands out as one of the go-to bowling venues in the ${alley.city}, ${alley.state} area.`,
    `Bowlers across ${alley.city}, ${alley.state} know ${alley.name} as a reliable spot to roll a few games and have a great time.`,
    `Looking for lanes in ${alley.city}? ${alley.name} is one of ${alley.state}'s well-known bowling centers, drawing crowds from across the region.`,
    `${alley.name}, situated in ${alley.city}, ${alley.state}, has earned a reputation as a welcoming bowling center for players at every level.`,
    `For bowlers in the ${alley.city} area, ${alley.name} is a trusted destination for practice sessions, league play, and family fun.`,
    `${alley.city}, ${alley.state} is home to ${alley.name}, a bowling center that caters to casual visitors and competitive players alike.`,
    `If you're searching for bowling near ${alley.city}, ${alley.name} is a standout choice in ${alley.state}.`,
  ];

  // Lane / facility sentences (8)
  const laneSentences = [
    `The center features ${laneText} lanes, providing plenty of room for open bowling, tournaments, and league nights.`,
    `With ${laneText} lanes available, ${alley.name} can accommodate everything from solo practice to large group events.`,
    `Equipped with ${laneText} lanes, the facility offers ample space for bowlers to work on their game or enjoy a night out.`,
    `${alley.name} operates ${laneText} lanes, making it a solid option for both walk-in bowlers and organized leagues.`,
    `Featuring ${laneText} lanes, this center gives bowlers room to practice spare conversions, test new equipment, and compete.`,
    `The venue boasts ${laneText} lanes — enough to host weekly leagues, birthday parties, and corporate events side by side.`,
    `At ${laneText} lanes, ${alley.name} offers a comfortable bowling experience without long waits during peak hours.`,
    `${alley.name} keeps ${laneText} lanes ready for action, serving the ${alley.city} community with consistent lane conditions.`,
  ];

  // Rating / reputation sentences (6 with rating, 6 without)
  const ratedSentences = hasRating
    ? [
        `The community has given it a ${alley.alley_rating}-star rating, reflecting the quality of its lanes and atmosphere.`,
        `With a community rating of ${alley.alley_rating} out of 5, it's clear that local bowlers appreciate what ${alley.name} brings to the table.`,
        `Rated ${alley.alley_rating}/5 by fellow bowlers, ${alley.name} consistently delivers a dependable bowling experience.`,
        `A ${alley.alley_rating}-star community rating speaks to the center's commitment to well-maintained lanes and a friendly environment.`,
        `Bowlers have rated ${alley.name} ${alley.alley_rating} out of 5 stars, a testament to its solid lane conditions and welcoming vibe.`,
        `Earning ${alley.alley_rating} stars from the Alley Cat community, ${alley.name} is a proven choice for quality bowling in ${alley.state}.`,
      ]
    : [
        `As more bowlers visit and leave reviews, ${alley.name}'s reputation in the ${alley.city} area continues to grow.`,
        `Be one of the first to rate ${alley.name} on Alley Cat and help fellow bowlers discover this ${alley.city} gem.`,
        `${alley.name} is waiting for its first community ratings — visit and share your experience with other bowlers.`,
        `The ${alley.city} bowling scene benefits from centers like ${alley.name} that keep the sport accessible and enjoyable.`,
        `${alley.name} is an important part of the ${alley.city} bowling landscape, offering a place for the community to gather and compete.`,
        `Local bowlers in ${alley.city} count on venues like ${alley.name} to keep the sport thriving in ${alley.state}.`,
      ];

  // CTA / Alley Cat tie-in sentences (8)
  const ctaSentences = [
    `Use Alley Cat to log your games at ${alley.name}, track your rolling average, and see how you stack up on the ${alley.city} leaderboard.`,
    `Planning a visit? Open Alley Cat to record every frame, monitor your spare conversion rate, and compete on the local leaderboard.`,
    `Track your performance at ${alley.name} with Alley Cat — log scores frame by frame, analyze trends, and climb the ${alley.city} rankings.`,
    `Next time you bowl at ${alley.name}, use Alley Cat to capture your scores and compare your stats against other ${alley.city} bowlers.`,
    `Alley Cat makes it easy to turn every session at ${alley.name} into data you can learn from — averages, strike rates, and more.`,
    `Whether it's league night or open bowling, Alley Cat helps you get the most out of every game at ${alley.name}.`,
    `Sign up for Alley Cat to start tracking your games at ${alley.name} and join the growing community of bowlers in ${alley.state}.`,
    `From casual games to serious league play, Alley Cat is the perfect companion for every visit to ${alley.name}.`,
  ];

  const opener = openers[h % openers.length];
  const lane = laneSentences[(h >> 3) % laneSentences.length];
  const rated = ratedSentences[(h >> 6) % ratedSentences.length];
  const cta = ctaSentences[(h >> 9) % ctaSentences.length];

  return `${opener} ${lane} ${rated} ${cta}`;
}
