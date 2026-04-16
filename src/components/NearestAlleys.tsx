import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface NearbyAlley {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  distance: number;
  alley_rating: number;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NearestAlleys = () => {
  const [alleys, setAlleys] = useState<NearbyAlley[]>([]);
  const [status, setStatus] = useState<"loading" | "denied" | "ready" | "unavailable">("loading");

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Fetch alleys with valid coordinates
        let all: any[] = [];
        let from = 0;
        while (true) {
          const { data } = await supabase
            .from("alleys")
            .select("id, name, slug, city, state, lat, lng, alley_rating")
            .order("name")
            .range(from, from + 999);
          if (!data || data.length === 0) break;
          all = all.concat(data);
          if (data.length < 1000) break;
          from += 1000;
        }

        const withDistance = all
          .filter((a) => a.lat !== 0 || a.lng !== 0)
          .map((a) => ({
            ...a,
            distance: haversine(latitude, longitude, a.lat, a.lng),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3);

        setAlleys(withDistance);
        setStatus("ready");
      },
      () => setStatus("denied"),
      { timeout: 10000 }
    );
  }, []);

  if (status === "unavailable" || status === "denied") return null;
  if (status === "loading") {
    return (
      <div className="border border-border bg-card p-3">
        <h3 className="text-xs text-primary font-bold mb-2">📍 NEAREST ALLEYS</h3>
        <p className="text-xs text-muted-foreground">Detecting location...</p>
      </div>
    );
  }

  if (alleys.length === 0) return null;

  return (
    <div className="border border-border bg-card">
      <div className="bg-muted px-3 py-2 border-b border-border">
        <h3 className="text-xs text-primary font-bold">📍 NEAREST ALLEYS</h3>
      </div>
      <div className="divide-y divide-border">
        {alleys.map((a) => (
          <Link
            key={a.id}
            to={`/alley/${a.slug}`}
            className="block px-3 py-2 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-primary font-bold">{a.name}</span>
                <p className="text-[10px] text-muted-foreground">{a.city}, {a.state}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-foreground font-bold">{a.distance.toFixed(1)} mi</span>
                {a.alley_rating > 0 && (
                  <p className="text-[10px] text-muted-foreground">{"⭐".repeat(Math.min(a.alley_rating, 5))}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NearestAlleys;
