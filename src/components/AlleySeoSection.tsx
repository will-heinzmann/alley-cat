import { Link } from "react-router-dom";
import { generateAlleyDescription } from "@/lib/alleyDescription";

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
  const description = generateAlleyDescription(alley);

  return (
    <section className="border-t border-border bg-muted/40 px-4 py-5 text-sm text-muted-foreground leading-relaxed space-y-4">
      <h2 className="text-base text-secondary font-bold">About {alley.name}</h2>
      <p>{description}</p>

      {relatedAlleys.length > 0 && (
        <div className="pt-2 border-t border-border">
          <h3 className="text-xs text-secondary font-bold mb-2">Other Alleys in {alley.state}</h3>
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
