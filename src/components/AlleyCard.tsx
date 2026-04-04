import { Link } from "react-router-dom";

interface AlleyCardProps {
  alley: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    lane_count: number;
    oil_pattern: string;
    beer_rating: number;
    alley_rating: number;
  };
}

const AlleyCard = ({ alley }: AlleyCardProps) => {
  return (
    <Link to={`/alley/${alley.id}`}>
      <div className="border border-border bg-card p-3 hover:bg-muted transition-colors cursor-pointer">
        <div className="flex items-start justify-between mb-1">
          <span className="text-sm text-primary font-bold">{alley.name}</span>
          <span className="text-xs text-secondary">{alley.lane_count} lanes</span>
        </div>
        <div className="text-xs text-muted-foreground mb-2">
          📍 {alley.address}, {alley.city}, {alley.state}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground">⭐ {alley.alley_rating}/5</span>
          <span className="text-secondary">
            {"🍺".repeat(alley.beer_rating)}{"·".repeat(5 - alley.beer_rating)}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default AlleyCard;
