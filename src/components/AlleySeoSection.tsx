import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AlleySeoSectionProps {
  alley: {
    id: string;
    name: string;
    city: string;
    state: string;
    lane_count: number;
    alley_rating: number;
    slug: string;
    oil_pattern?: string;
    address?: string;
  };
}

const AlleySeoSection = ({ alley }: AlleySeoSectionProps) => {
  const [relatedAlleys, setRelatedAlleys] = useState<{ name: string; slug: string; city: string }[]>([]);

  useEffect(() => {
    const fetchRelated = async () => {
      const { data } = await supabase
        .from("alleys")
        .select("name, slug, city")
        .eq("state", alley.state)
        .neq("id", alley.id)
        .not("name", "ilike", "%test%")
        .order("created_at", { ascending: false })
        .limit(5);
      setRelatedAlleys(data || []);
    };
    fetchRelated();
  }, [alley.id, alley.state]);

  const ratingText = alley.alley_rating > 0 ? `${alley.alley_rating}` : "N/A";
  const laneText = alley.lane_count > 0 ? String(alley.lane_count) : "multiple";
  const oilText = alley.oil_pattern && alley.oil_pattern !== "Unknown" ? alley.oil_pattern : null;

  return (
    <section className="mt-6 border-t border-border bg-muted/40 px-4 py-6 text-xs text-muted-foreground leading-relaxed space-y-4">
      <h3 className="text-sm text-secondary font-bold">About {alley.name}</h3>

      <p>
        {alley.name} is a prominent bowling destination located in {alley.city}, {alley.state}. As one of the key spots for bowling in the {alley.city} area, it offers a welcoming environment for both casual bowlers and dedicated league players looking to sharpen their skills. Whether you are a first-time bowler exploring the sport or a seasoned competitor chasing a perfect 300 game, {alley.name} provides the lanes and atmosphere to make every visit memorable.
      </p>

      <p>
        Equipped with approximately {laneText} lanes, {alley.name} provides the necessary infrastructure for a great session on the hardwood. With a community rating of {ratingText} stars, it remains a highly-regarded venue for locals searching for "bowling near {alley.city}" or "bowling alleys in {alley.state}." The facility caters to open-play sessions, birthday parties, corporate events, and competitive league nights throughout the week.
      </p>

      {oilText && (
        <p>
          The lane conditions at {alley.name} currently feature a {oilText} oil pattern. Understanding oil patterns is crucial for improving your bowling game — different patterns affect ball movement, hook potential, and pin carry. Whether you prefer a house shot for recreational play or a more challenging sport pattern for competition, knowing the conditions at {alley.name} gives you a strategic advantage before you even lace up your shoes.
        </p>
      )}

      <h4 className="text-xs text-secondary font-bold pt-2">Why Bowl at {alley.name}?</h4>

      <p>
        Bowling continues to be one of America's most popular recreational activities, and {alley.city} is no exception. {alley.name} serves as a community hub where friends, families, and league bowlers come together. The alley's location in {alley.city}, {alley.state} makes it easily accessible for residents and visitors alike. Many bowlers return week after week to improve their averages, compete in local tournaments, and enjoy the social side of the sport.
      </p>

      <p>
        For league bowlers, {alley.name} offers structured competition that helps you track your progress over an entire season. League play is one of the best ways to steadily improve your bowling average, develop consistency in your approach, and learn to read different lane conditions. If you are new to league bowling in {alley.city}, {alley.name} is a great place to start — most centers welcome bowlers of all skill levels.
      </p>

      <h4 className="text-xs text-secondary font-bold pt-2">Track Your Scores at {alley.name} with Alley Cat</h4>

      <p>
        If you're visiting {alley.name} soon, make sure to use Alley Cat to track your scores. Our platform allows you to log every frame, analyze your spare conversions, and see how your performance compares to the local {alley.city} leaderboard. Turn your next visit to {alley.name} into a data-driven session to help improve your average. Alley Cat tracks your strike percentage, spare conversion rate, pin counts, and rolling series averages so you can identify trends and weaknesses in your game.
      </p>

      <p>
        With Alley Cat, you can also follow other bowlers, share your best games on the community feed, and compete on global and alley-specific leaderboards. Every game you log at {alley.name} earns you AlleyPoints and contributes to your bowler profile — building a comprehensive history of your bowling journey across every center you visit in {alley.state} and beyond.
      </p>

      <h4 className="text-xs text-secondary font-bold pt-2">Bowling Tips for {alley.name}</h4>

      <p>
        To get the most out of your session at {alley.name}, consider these bowling tips: arrive early to get warmed up with a few practice frames, pay attention to the oil pattern on the lanes, and focus on your spare shooting — converting spares consistently is the fastest way to raise your average. Many bowlers focus on strikes, but the difference between a 150 and a 180 average often comes down to spare conversion rate.
      </p>

      <p>
        If you're bowling at {alley.name} for the first time, take a moment to observe how the lanes are playing. House patterns typically have more oil in the center of the lane and less on the outside, creating a forgiving condition that guides the ball toward the pocket. As the session progresses and the oil breaks down, you may need to adjust your target or ball speed. Tracking these adjustments in Alley Cat helps you learn how to adapt faster at any bowling center.
      </p>

      <p>
        Whether you're looking for bowling in {alley.city}, searching for a great bowling alley in {alley.state}, or simply want to track your scores and improve your game, {alley.name} and Alley Cat make the perfect combination. Create a free account today and start logging your games to see how you stack up against bowlers across the country.
      </p>

      {relatedAlleys.length > 0 && (
        <div className="pt-2 border-t border-border">
          <h4 className="text-xs text-secondary font-bold mb-2">Other Bowling Alleys in {alley.state}</h4>
          <p className="mb-2">
            Looking for more places to bowl in {alley.state}? Check out these other bowling centers tracked on Alley Cat. Each venue has its own leaderboard, reviews, and lane conditions — find the perfect alley for your next outing.
          </p>
          <ul className="space-y-1">
            {relatedAlleys.map((a) => (
              <li key={a.slug}>
                <Link to={`/alley/${a.slug}`} className="text-primary hover:underline">
                  🎳 {a.name}
                </Link>
                <span className="text-muted-foreground ml-1">— {a.city}, {alley.state}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default AlleySeoSection;
