import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import AlleyCard from "@/components/AlleyCard";
import { buildCitySlug, getStateName } from "@/lib/citySlug";

interface CityAlley {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  address: string;
  alley_rating: number;
  beer_rating: number;
  lane_count: number;
  pinsetter_type: string;
  oil_pattern: string;
  lat: number;
  lng: number;
}

const CityPage = () => {
  const { citySlug } = useParams();
  const [alleys, setAlleys] = useState<CityAlley[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedCity, setResolvedCity] = useState<{ city: string; state: string } | null>(null);

  // Parse "city-name-st" -> stateCode is last segment, rest is the city slug
  const parsed = useMemo(() => {
    if (!citySlug) return null;
    const parts = citySlug.split("-");
    if (parts.length < 2) return null;
    const stateCode = parts[parts.length - 1].toUpperCase();
    const cityHint = parts.slice(0, -1).join("-");
    return { stateCode, cityHint };
  }, [citySlug]);

  useEffect(() => {
    const fetchCity = async () => {
      if (!parsed) {
        setLoading(false);
        return;
      }
      // Pull alleys in that state, then filter by matching city slug client-side
      // (Cities are not slugged in DB, so we match by buildCitySlug equality.)
      let all: any[] = [];
      let from = 0;
      const batch = 1000;
      while (true) {
        const { data } = await supabase
          .from("alleys")
          .select("id, name, slug, city, state, address, alley_rating, beer_rating, lane_count, pinsetter_type, oil_pattern, lat, lng")
          .eq("state", parsed.stateCode)
          .order("alley_rating", { ascending: false })
          .range(from, from + batch - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < batch) break;
        from += batch;
      }

      const matches = all.filter((a) => buildCitySlug(a.city, a.state) === citySlug);
      setAlleys(matches);
      if (matches[0]) {
        setResolvedCity({ city: matches[0].city, state: matches[0].state });
      }
      setLoading(false);
    };
    fetchCity();
  }, [citySlug, parsed]);

  useEffect(() => {
    if (!loading) document.dispatchEvent(new Event("alleycat:prerender-ready"));
  }, [loading]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  }

  if (!resolvedCity || alleys.length === 0) {
    return (
      <div className="min-h-screen p-6 text-center space-y-3">
        <Helmet><title>City Not Found | Alley Cat</title></Helmet>
        <h1 className="text-lg text-primary">No alleys found for this city</h1>
        <p className="text-sm text-muted-foreground">Try the <Link to="/alleys" className="text-primary underline">full directory</Link>.</p>
      </div>
    );
  }

  const { city, state } = resolvedCity;
  const stateName = getStateName(state);
  const canonical = `https://alleycat-bowling.com/city/${citySlug}`;
  const topRated = [...alleys].sort((a, b) => b.alley_rating - a.alley_rating).slice(0, 5);
  const totalLanes = alleys.reduce((sum, a) => sum + (a.lane_count || 0), 0);
  const avgRating = (alleys.reduce((s, a) => s + (a.alley_rating || 0), 0) / alleys.length).toFixed(1);

  return (
    <div className="min-h-screen pb-20">
      <Helmet>
        <title>{`Best Bowling Alleys in ${city}, ${state} (${alleys.length} Lanes Listed) | Alley Cat`}</title>
        <meta
          name="description"
          content={`Find the best bowling alleys in ${city}, ${stateName}. Browse ${alleys.length} venues, top-rated lanes, scores, reviews, and leagues. Updated regularly on Alley Cat.`}
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`Best Bowling Alleys in ${city}, ${state} | Alley Cat`} />
        <meta property="og:description" content={`Top-rated bowling alleys in ${city}, ${stateName} — ${alleys.length} venues with reviews and live leaderboards.`} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Best Bowling Alleys in ${city}, ${state}`,
          itemListElement: topRated.map((a, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            url: `https://alleycat-bowling.com/alley/${a.slug}`,
            name: a.name,
          })),
        })}</script>
      </Helmet>

      <header className="border-b border-border p-4">
        <Link to="/alleys" className="text-primary text-xs">← Back to Directory</Link>
        <h1 className="text-xl text-primary mt-1">🎳 Best Bowling Alleys in {city}, {state}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {alleys.length} venues · {totalLanes} total lanes · avg rating {avgRating}/5
        </p>
        <hr className="border-primary mt-2" />
      </header>

      <div className="p-4 space-y-5">
        <section className="border border-border bg-card p-3">
          <h2 className="text-sm text-secondary font-bold border-b border-border pb-1 mb-2">⭐ Top-Rated in {city}</h2>
          <ol className="space-y-1 text-xs">
            {topRated.map((a, i) => (
              <li key={a.id} className="flex items-start gap-2">
                <span className="text-primary font-bold w-5">{i + 1}.</span>
                <div className="flex-1">
                  <Link to={`/alley/${a.slug}`} className="text-primary hover:underline font-bold">{a.name}</Link>
                  <p className="text-muted-foreground">{a.address} · ⭐ {a.alley_rating}/5 · {a.lane_count} lanes</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-sm text-primary border-b border-primary pb-1 mb-2">📋 All Alleys in {city}</h2>
          <div className="space-y-2">
            {alleys.map((a) => <AlleyCard key={a.id} alley={a} />)}
          </div>
        </section>

        <section className="border-t border-border bg-muted/40 px-4 py-5 text-sm text-muted-foreground leading-relaxed space-y-3">
          <h2 className="text-base text-secondary font-bold">About Bowling in {city}, {stateName}</h2>
          <p>
            Looking for the best bowling alley in {city}? Alley Cat lists {alleys.length} {alleys.length === 1 ? "venue" : "venues"} across {city}, {stateName} —
            from neighborhood lanes perfect for casual nights out to competitive houses where serious league bowlers chase their next 300 game.
            Use the directory to compare lane counts, pinsetter types, oil patterns, and real bowler ratings.
          </p>
          <p>
            Whether you're searching for "bowling near me in {city}" or planning a league night, every alley on this page has a profile with reviews,
            a live local leaderboard, and the ability to log your own scores frame-by-frame. Sign up free to track your average and compete with other
            {" "}{city} bowlers.
          </p>
        </section>
      </div>
    </div>
  );
};

export default CityPage;
