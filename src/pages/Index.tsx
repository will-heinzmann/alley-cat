import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AlleyCard from "@/components/AlleyCard";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useFavoriteAlleys } from "@/hooks/useFavoriteAlleys";

// Fix default leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});
const BATCH_SIZE = 1000;
const PAGE_SIZE = 50;

const HomePage = () => {
  const { user } = useAuth();
  const { favoriteIds } = useFavoriteAlleys();
  const [search, setSearch] = useState("");
  const [alleys, setAlleys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    fetchAlleys();
  }, []);

  const fetchAlleys = async () => {
    let all: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("alleys")
        .select("*")
        .order("name")
        .range(from, from + BATCH_SIZE - 1);
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < BATCH_SIZE) break;
      from += BATCH_SIZE;
    }
    setAlleys(all);
    setLoading(false);
  };

  const states = useMemo(() => {
    const s = [...new Set(alleys.map((a) => a.state))].sort();
    return s;
  }, [alleys]);

  const cities = useMemo(() => {
    let filtered = alleys;
    if (stateFilter) filtered = filtered.filter((a) => a.state === stateFilter);
    return [...new Set(filtered.map((a) => a.city))].sort();
  }, [alleys, stateFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, stateFilter, cityFilter, minRating]);

  const filtered = useMemo(() => alleys.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase()) ||
      a.state.toLowerCase().includes(search.toLowerCase()) ||
      a.address.toLowerCase().includes(search.toLowerCase());
    const matchesState = !stateFilter || a.state === stateFilter;
    const matchesCity = !cityFilter || a.city === cityFilter;
    const matchesRating = a.alley_rating >= minRating;
    return matchesSearch && matchesState && matchesCity && matchesRating;
  }), [alleys, search, stateFilter, cityFilter, minRating]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border p-4 text-center">
        <h1 className="text-2xl text-primary tracking-wide">
          🎳 ALLEY CAT 🎳
        </h1>
        <p className="text-sm text-secondary mt-1">
          Find Your Lane
        </p>
        <hr className="border-primary mt-3" />
      </header>

      {/* Search & Filters */}
      <div className="p-4">
        <table className="w-full border border-border">
          <tbody>
            <tr>
              <td className="border border-border p-2 bg-muted text-sm font-pixel text-xs">Search:</td>
              <td className="border border-border p-1">
                <input
                  type="text"
                  placeholder="City, state, or alley name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-input border border-border px-2 py-1 text-foreground text-sm outline-none"
                />
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 bg-muted text-xs">State:</td>
              <td className="border border-border p-1">
                <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setCityFilter(""); }}
                  className="w-full bg-input border border-border px-2 py-1 text-foreground text-sm outline-none">
                  <option value="">All States</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 bg-muted text-xs">City:</td>
              <td className="border border-border p-1">
                <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full bg-input border border-border px-2 py-1 text-foreground text-sm outline-none">
                  <option value="">All Cities</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 bg-muted text-xs">Min Rating:</td>
              <td className="border border-border p-1">
                <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full bg-input border border-border px-2 py-1 text-foreground text-sm outline-none">
                  <option value={0}>Any</option>
                  <option value={1}>⭐ 1+</option>
                  <option value={2}>⭐ 2+</option>
                  <option value={3}>⭐ 3+</option>
                  <option value={4}>⭐ 4+</option>
                  <option value={5}>⭐ 5</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* View Toggle & Alley List/Map */}
      <div className="px-4">
        <div className="flex items-center justify-between border-b border-primary pb-1 mb-3">
          <h2 className="text-sm text-primary">
            📋 DIRECTORY — {filtered.length} alleys
          </h2>
          <div className="flex gap-1">
            <button onClick={() => setViewMode("list")}
              className={`text-xs px-2 py-0.5 border ${viewMode === "list" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              [List]
            </button>
            <button onClick={() => setViewMode("map")}
              className={`text-xs px-2 py-0.5 border ${viewMode === "map" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              [Map]
            </button>
          </div>
        </div>
        {loading ? (
          <p className="text-center text-sm text-muted-foreground p-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No alleys found.</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
          </div>
        ) : viewMode === "map" ? (
          <div className="border border-border" style={{ height: "500px" }}>
            <MapContainer
              center={[39.8, -98.5]}
              zoom={4}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filtered.filter((a) => a.lat && a.lng && (a.lat !== 0 || a.lng !== 0)).slice(0, 500).map((alley) => (
                <Marker key={alley.id} position={[alley.lat, alley.lng]}>
                  <Popup>
                    <div className="text-xs">
                      <strong>{alley.name}</strong><br />
                      {alley.city}, {alley.state}<br />
                      ⭐ {alley.alley_rating}/5<br />
                      <Link to={`/alley/${alley.id}`} className="text-blue-600 underline">View Details</Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paged.map((alley) => <AlleyCard key={alley.id} alley={alley} />)}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border border-border px-3 py-1 bg-muted text-foreground disabled:opacity-40"
                >
                  ◀ Prev
                </button>
                <span className="text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border border-border px-3 py-1 bg-muted text-foreground disabled:opacity-40"
                >
                  Next ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="text-center p-6 mt-4">
        <hr className="border-border mb-3" />
        <p className="text-xs text-muted-foreground">
          ⚡ Alley Cat © {new Date().getFullYear()} — Best viewed at 800x600
        </p>
      </div>
    </div>
  );
};

export default HomePage;
