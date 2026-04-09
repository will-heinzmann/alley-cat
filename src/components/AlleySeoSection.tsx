import { Link } from "react-router-dom";

interface AlleySeoSectionProps {
  alley: {
    id: string;
    name: string;
    city: string;
    state: string;
    lane_count: number;
    alley_rating: number;
    slug: string;
  };
  relatedAlleys: { name: string; slug: string; city: string }[];
}

const AlleySeoSection = ({ alley, relatedAlleys }: AlleySeoSectionProps) => {
  const ratingText = alley.alley_rating > 0 ? `${alley.alley_rating}` : "N/A";
  const laneText = alley.lane_count > 0 ? String(alley.lane_count) : "multiple";

  return (
    <section className="mt-6 border-t border-border bg-muted/40 px-4 py-6 text-xs text-muted-foreground leading-relaxed space-y-4">
      <h3 className="text-sm text-secondary font-bold">About {alley.name}</h3>

      <p>
        {alley.name} is a prominent bowling destination located in {alley.city}, {alley.state}. As one of the key spots for bowling in the {alley.city} area, it offers a welcoming environment for both casual bowlers and dedicated league players looking to sharpen their skills.
      </p>

      <p>
        Equipped with approximately {laneText} lanes, {alley.name} provides the necessary infrastructure for a great session on the hardwood. With a community rating of {ratingText} stars, it remains a highly-regarded venue for locals searching for "bowling near {alley.city}."
      </p>

      <p>
        If you're visiting {alley.name} soon, make sure to use Alley Cat to track your scores. Our platform allows you to log every frame, analyze your spare conversions, and see how your performance compares to the local {alley.city} leaderboard. Turn your next visit to {alley.name} into a data-driven session to help improve your average.
      </p>

      {relatedAlleys.length > 0 && (
        <div className="pt-2 border-t border-border">
          <h4 className="text-xs text-secondary font-bold mb-2">Other Alleys in {alley.state}</h4>
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
