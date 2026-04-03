import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AlleyCard from "@/components/AlleyCard";

const HomePage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [alleys, setAlleys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlleys();
  }, []);

  const fetchAlleys = async () => {
    const { data } = await supabase.from("alleys").select("*").order("name");
    setAlleys(data || []);
    setLoading(false);
  };

  const filtered = alleys.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase()) ||
      a.state.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Search */}
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
          </tbody>
        </table>
      </div>

      {/* Alley List */}
      <div className="px-4">
        <h2 className="text-sm text-primary border-b border-primary pb-1 mb-3">
          📋 DIRECTORY — {filtered.length} alleys
        </h2>
        {loading ? (
          <p className="text-center text-sm text-muted-foreground p-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No alleys found.</p>
            <p className="text-xs text-muted-foreground mt-1">Alleys will appear here once data is imported.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((alley) => <AlleyCard key={alley.id} alley={alley} />)}
          </div>
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
