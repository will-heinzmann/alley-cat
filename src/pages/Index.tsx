import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AlleyCard from "@/components/AlleyCard";
import { Search, MapPin } from "lucide-react";

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
      <header className="border-b-2 border-primary p-4">
        <h1 className="font-pixel text-lg text-primary neon-text text-center animate-flicker">
          ALLEY CAT
        </h1>
        <p className="font-pixel text-[8px] text-secondary text-center mt-1 orange-text">
          FIND YOUR LANE
        </p>
      </header>

      {/* Map Placeholder */}
      <div className="border-b-2 border-primary bg-muted h-48 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full animate-pulse-neon"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
        <div className="text-center z-10">
          <MapPin size={32} className="text-primary mx-auto mb-2 neon-text" />
          <p className="font-pixel text-[10px] text-muted-foreground">MAP VIEW</p>
          <p className="text-xs text-muted-foreground mt-1">{alleys.length} alleys loaded</p>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="flex items-center border-2 border-primary bg-input px-3 py-2">
          <Search size={16} className="text-primary mr-2" />
          <input
            type="text"
            placeholder="Search city, state, or alley..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-foreground text-sm w-full outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Alley List */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-pixel text-[10px] text-primary">DIRECTORY [{filtered.length}]</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <p className="font-pixel text-xs text-muted-foreground animate-pulse-neon">LOADING...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-muted p-8 text-center">
            <p className="font-pixel text-xs text-muted-foreground">NO ALLEYS FOUND</p>
            <p className="text-xs text-muted-foreground mt-2">Alleys will appear here once data is imported</p>
          </div>
        ) : (
          filtered.map((alley) => <AlleyCard key={alley.id} alley={alley} />)
        )}
      </div>
    </div>
  );
};

export default HomePage;
