import { Alley } from "@/types";
import { MapPin, Droplets, Beer } from "lucide-react";
import { Link } from "react-router-dom";

interface AlleyCardProps {
  alley: Alley;
}

const AlleyCard = ({ alley }: AlleyCardProps) => {
  return (
    <Link to={`/alley/${alley.id}`}>
      <div className="border-2 border-primary bg-card p-4 transition-all hover:neon-border cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-pixel text-xs text-primary neon-text leading-relaxed">
            {alley.name}
          </h3>
          <span className="font-pixel text-[10px] text-secondary orange-text">
            {alley.lane_count}L
          </span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
          <MapPin size={12} />
          <span>{alley.city}, {alley.state}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs">
            <Droplets size={12} className="text-primary" />
            <span className="text-foreground">{alley.oil_pattern}</span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Beer
                key={i}
                size={12}
                className={i < alley.beer_rating ? "text-secondary" : "text-muted"}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AlleyCard;
