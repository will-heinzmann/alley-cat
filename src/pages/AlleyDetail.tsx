import { useParams, Link } from "react-router-dom";
import { mockAlleys, mockReviews } from "@/data/mockData";
import { ArrowLeft, MapPin, Phone, Globe, Droplets, Beer, Star } from "lucide-react";

const AlleyDetail = () => {
  const { id } = useParams();
  const alley = mockAlleys.find((a) => a.id === id);
  const reviews = mockReviews.filter((r) => r.alley_id === id);

  if (!alley) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-pixel text-xs text-muted-foreground">ALLEY NOT FOUND</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b-2 border-primary p-4 flex items-center gap-3">
        <Link to="/" className="text-primary hover:neon-text">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-pixel text-xs text-primary neon-text">
          {alley.name.toUpperCase()}
        </h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Info Card */}
        <div className="border-2 border-primary bg-card p-4 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-primary mt-0.5" />
            <div>
              <p className="text-sm">{alley.address}</p>
              <p className="text-sm text-muted-foreground">{alley.city}, {alley.state}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-primary" />
            <span className="text-sm">{alley.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-primary" />
            <span className="text-sm text-primary">{alley.website}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="border-2 border-primary bg-card p-3 text-center">
            <p className="font-pixel text-lg text-primary neon-text">{alley.lane_count}</p>
            <p className="font-pixel text-[7px] text-muted-foreground mt-1">LANES</p>
          </div>
          <div className="border-2 border-secondary bg-card p-3 text-center">
            <Droplets size={20} className="text-primary mx-auto" />
            <p className="font-pixel text-[7px] text-muted-foreground mt-1">{alley.oil_pattern.toUpperCase()}</p>
          </div>
          <div className="border-2 border-secondary bg-card p-3 text-center">
            <div className="flex justify-center gap-0.5">
              {Array.from({ length: alley.beer_rating }).map((_, i) => (
                <Beer key={i} size={12} className="text-secondary" />
              ))}
            </div>
            <p className="font-pixel text-[7px] text-muted-foreground mt-1">BEER</p>
          </div>
        </div>

        {/* Reviews */}
        <div>
          <h2 className="font-pixel text-[10px] text-secondary orange-text mb-3">
            REVIEWS [{reviews.length}]
          </h2>
          {reviews.length === 0 && (
            <div className="border-2 border-muted p-6 text-center">
              <p className="font-pixel text-[9px] text-muted-foreground">NO REVIEWS YET</p>
            </div>
          )}
          {reviews.map((review) => (
            <div key={review.id} className="border-2 border-muted bg-card p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel text-[9px] text-primary">{review.username}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={10}
                      className={i < review.rating ? "text-secondary fill-secondary" : "text-muted"}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-foreground mb-2">{review.comment}</p>
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span>Oil: {review.oil_rating}/5</span>
                <span>Beer: {review.beer_rating}/5</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlleyDetail;
